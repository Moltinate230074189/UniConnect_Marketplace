CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  selected_role public.app_role;
BEGIN
  selected_role := CASE new.raw_user_meta_data->>'role'
    WHEN 'vendor' THEN 'vendor'::public.app_role
    WHEN 'faculty' THEN 'faculty'::public.app_role
    ELSE 'student'::public.app_role
  END;

  INSERT INTO public.profiles (id, email, full_name, campus_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'campus_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, selected_role);
  RETURN new;
END;
$$;

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  href text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.create_direct_conversation(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = _other_user_id THEN
    RAISE EXCEPTION 'Invalid participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _other_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT cp1.conversation_id INTO existing_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = auth.uid() AND cp2.user_id = _other_user_id
    AND (SELECT count(*) FROM public.conversation_participants x WHERE x.conversation_id = cp1.conversation_id) = 2
  LIMIT 1;

  IF existing_id IS NOT NULL THEN RETURN existing_id; END IF;

  INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO new_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (new_id, auth.uid()), (new_id, _other_user_id);
  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated;

CREATE POLICY "participants read conversations" ON public.conversations
FOR SELECT TO authenticated USING (public.is_conversation_participant(id, auth.uid()));
CREATE POLICY "authenticated create conversations" ON public.conversations
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "participants update conversations" ON public.conversations
FOR UPDATE TO authenticated USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "participants read membership" ON public.conversation_participants
FOR SELECT TO authenticated USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "own membership update" ON public.conversation_participants
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants read messages" ON public.messages
FOR SELECT TO authenticated USING (public.is_conversation_participant(conversation_id, auth.uid()));
CREATE POLICY "participants send messages" ON public.messages
FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND public.is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "own notifications read" ON public.notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.on_message_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations SET updated_at = new.created_at WHERE id = new.conversation_id;
  INSERT INTO public.notifications (user_id, title, body, href)
  SELECT cp.user_id, 'New message', left(new.body, 120), '/inbox?conversation=' || new.conversation_id::text
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = new.conversation_id AND cp.user_id <> new.sender_id;
  RETURN new;
END;
$$;

CREATE TRIGGER message_created_notify
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_message_created();

CREATE INDEX conversations_updated_at_idx ON public.conversations(updated_at DESC);
CREATE INDEX messages_conversation_created_idx ON public.messages(conversation_id, created_at);
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);