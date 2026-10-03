import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [
    { title: "Notifications — UniConnect" },
    { name: "description", content: "Review your latest UniConnect updates." },
    { property: "og:title", content: "Notifications — UniConnect" },
    { property: "og:description", content: "Review your latest UniConnect updates." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["notifications"], queryFn: async () => { const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const markAll = useMutation({ mutationFn: async () => { const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["communication-counts"] }); } });
  return <AppShell header="tabs"><div className="p-4"><div className="flex items-center justify-between"><h1 className="text-xl font-extrabold text-navy">Notifications</h1><Button variant="ghost" size="sm" onClick={() => markAll.mutate()} disabled={!data.some((item) => !item.read_at)}><CheckCheck className="mr-1.5 h-4 w-4" />Mark all read</Button></div>
    {data.length === 0 ? <div className="py-16 text-center"><Bell className="mx-auto h-12 w-12 text-muted-foreground" /><p className="mt-3 font-semibold">You’re all caught up</p><p className="text-sm text-muted-foreground">New account, order and message updates will appear here.</p></div> : <div className="mt-4 divide-y rounded-xl border bg-card">{data.map((item) => <Link key={item.id} to={(item.href || "/notifications") as "/notifications"} onClick={() => { if (!item.read_at) supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id).then(() => qc.invalidateQueries({ queryKey: ["communication-counts"] })); }} className={`block p-4 ${item.read_at ? "" : "bg-brand-soft/60"}`}><div className="flex gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-border" : "bg-brand"}`} /><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("en-ZA")}</p></div></div></Link>)}</div>}
  </div></AppShell>;
}