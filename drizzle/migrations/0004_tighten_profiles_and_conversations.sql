DROP POLICY IF EXISTS "authenticated create conversations" ON public.conversations;
REVOKE INSERT ON public.conversations FROM authenticated;
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, full_name, campus_name, avatar_url, two_factor_enabled, created_at) ON public.profiles TO authenticated;
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT email FROM public.profiles WHERE id = auth.uid() $$;