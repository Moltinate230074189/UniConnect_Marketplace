import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, Send } from "lucide-react";
import { AppShell, useMe } from "@/components/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [
    { title: "Inbox — UniConnect" },
    { name: "description", content: "Read and send private UniConnect messages." },
    { property: "og:title", content: "Inbox — UniConnect" },
    { property: "og:description", content: "Read and send private UniConnect messages." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Inbox,
});

function initials(name?: string | null) { return (name || "U").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }

function Inbox() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const [selected, setSelected] = useState(search.get("conversation"));
  const [body, setBody] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");

  const { data: memberships = [] } = useQuery({
    queryKey: ["conversations", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.from("conversation_participants").select("conversation_id, last_read_at, conversations(updated_at)").eq("user_id", me?.user.id ?? "");
      if (error) throw error;
      return data;
    },
  });
  const conversationIds = memberships.map((item) => item.conversation_id);
  const { data: participants = [] } = useQuery({
    queryKey: ["conversation-people", conversationIds], enabled: conversationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("conversation_participants").select("conversation_id, user_id, profiles(full_name, avatar_url)").in("conversation_id", conversationIds).neq("user_id", me?.user.id ?? "");
      if (error) throw error; return data;
    },
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selected], enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("id, body, sender_id, created_at").eq("conversation_id", selected ?? "").order("created_at");
      if (error) throw error; return data;
    },
  });
  const { data: people = [] } = useQuery({
    queryKey: ["message-people", peopleSearch], enabled: peopleSearch.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url, campus_name").neq("id", me?.user.id ?? "").ilike("full_name", `%${peopleSearch.trim()}%`).limit(6);
      if (error) throw error; return data;
    },
  });

  useEffect(() => {
    if (!selected || !me) return;
    supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", selected).eq("user_id", me.user.id).then(() => qc.invalidateQueries({ queryKey: ["communication-counts"] }));
  }, [selected, me, qc]);

  const startConversation = useMutation({ mutationFn: async (userId: string) => {
    const { data, error } = await supabase.rpc("create_direct_conversation", { _other_user_id: userId });
    if (error) throw error; return data;
  }, onSuccess: (id) => { setSelected(id); setPeopleSearch(""); qc.invalidateQueries({ queryKey: ["conversations"] }); } });
  const send = useMutation({ mutationFn: async () => {
    if (!me || !selected || !body.trim()) return;
    const { error } = await supabase.from("messages").insert({ conversation_id: selected, sender_id: me.user.id, body: body.trim() });
    if (error) throw error;
  }, onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["messages", selected] }); qc.invalidateQueries({ queryKey: ["conversations"] }); } });

  const selectedPerson = participants.find((item) => item.conversation_id === selected)?.profiles;
  const sorted = useMemo(() => [...memberships].sort((a, b) => String(b.conversations?.updated_at).localeCompare(String(a.conversations?.updated_at))), [memberships]);

  return <AppShell header="tabs">
    <div className="flex min-h-[70vh] flex-col">
      <div className="border-b p-4">
        <h1 className="text-xl font-extrabold text-navy">Inbox</h1>
        <div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={peopleSearch} onChange={(event) => setPeopleSearch(event.target.value)} placeholder="Find a student, faculty member or vendor" className="h-11 rounded-xl bg-muted pl-9" /></div>
        {people.length > 0 && <div className="mt-2 divide-y rounded-xl border bg-card">{people.map((person) => <button key={person.id} onClick={() => startConversation.mutate(person.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted"><Avatar><AvatarImage src={person.avatar_url ?? undefined} /><AvatarFallback>{initials(person.full_name)}</AvatarFallback></Avatar><span><span className="block text-sm font-semibold">{person.full_name}</span><span className="block text-xs text-muted-foreground">{person.campus_name}</span></span></button>)}</div>}
      </div>
      {!selected ? <div className="flex-1 p-4">{sorted.length === 0 ? <div className="py-16 text-center"><MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" /><p className="mt-3 font-semibold">No conversations yet</p><p className="text-sm text-muted-foreground">Search for someone above to start chatting.</p></div> : <div className="divide-y rounded-xl border bg-card">{sorted.map((item) => { const person = participants.find((p) => p.conversation_id === item.conversation_id)?.profiles; return <button key={item.conversation_id} onClick={() => setSelected(item.conversation_id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted"><Avatar><AvatarImage src={person?.avatar_url ?? undefined} /><AvatarFallback>{initials(person?.full_name)}</AvatarFallback></Avatar><span className="font-semibold">{person?.full_name || "UniConnect member"}</span></button>; })}</div>}</div> : <>
        <div className="flex items-center gap-3 border-b p-3"><Button variant="ghost" size="sm" onClick={() => { setSelected(null); navigate({ to: "/inbox" }); }}>Back</Button><Avatar><AvatarImage src={selectedPerson?.avatar_url ?? undefined} /><AvatarFallback>{initials(selectedPerson?.full_name)}</AvatarFallback></Avatar><p className="font-semibold">{selectedPerson?.full_name || "Conversation"}</p></div>
        <div className="flex flex-1 flex-col gap-2 p-4">{messages.map((message) => <div key={message.id} className={`max-w-[82%] rounded-xl px-3 py-2 text-sm ${message.sender_id === me?.user.id ? "ml-auto bg-brand text-brand-foreground" : "bg-muted"}`}>{message.body}<span className="mt-1 block text-[10px] opacity-70">{new Date(message.created_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div>
        <form onSubmit={(event) => { event.preventDefault(); send.mutate(); }} className="sticky bottom-14 flex gap-2 border-t bg-background p-3"><Input value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="Write a message" className="h-11 rounded-xl" /><Button size="icon" className="h-11 w-11 rounded-xl" disabled={!body.trim() || send.isPending} aria-label="Send message"><Send className="h-4 w-4" /></Button></form>
      </>}
    </div>
  </AppShell>;
}