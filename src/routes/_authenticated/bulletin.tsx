import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bulletin")({
  head: () => ({
    meta: [
      { title: "Community Board — UniConnect" },
      { name: "description", content: "Campus announcements, lost & found and student services." },
      { property: "og:title", content: "Community Board — UniConnect" },
      { property: "og:description", content: "Campus announcements, lost & found and student services." },
    ],
  }),
  component: Bulletin,
});

const TAGS = { announcement: "Announcement", lost_and_found: "Lost & Found", service: "Service" } as const;
type Tag = keyof typeof TAGS;
const TAG_STYLE: Record<Tag, string> = {
  announcement: "bg-navy text-navy-foreground",
  lost_and_found: "bg-chart-4/20 text-foreground",
  service: "bg-brand-soft text-brand-dark",
};

function Bulletin() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [filter, setFilter] = useState<Tag | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", tag: "announcement" as Tag });

  const { data: posts } = useQuery({
    queryKey: ["bulletin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bulletin_posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Not signed in");
      const { error } = await supabase.from("bulletin_posts").insert({ ...form, author_id: me.user.id, author_name: me.profile?.full_name ?? me.user.email });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Posted!"); setOpen(false); setForm({ title: "", content: "", tag: "announcement" }); qc.invalidateQueries({ queryKey: ["bulletin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function remove(id: string) {
    const { error } = await supabase.from("bulletin_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["bulletin"] });
  }

  const list = posts?.filter((p) => filter === "all" || p.tag === filter);

  return (
    <AppShell>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Community Board</h1>
          <Button size="sm" className="rounded-xl" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Announcement</Button>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {(["all", ...Object.keys(TAGS)] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t as Tag | "all")} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", filter === t ? "border-brand bg-brand text-brand-foreground" : "bg-card")}>
              {t === "all" ? "All" : TAGS[t as Tag]}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {list?.map((p) => (
            <article key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", TAG_STYLE[p.tag as Tag])}>{TAGS[p.tag as Tag]}</span>
                {me && p.author_id === me.user.id && (
                  <button aria-label="Delete post" onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              <h2 className="mt-2 font-bold">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.content}</p>
              <p className="mt-3 text-xs text-muted-foreground">{p.author_name} · {new Date(p.created_at).toLocaleDateString("en-ZA")}</p>
            </article>
          ))}
          {list?.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Add Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={form.tag} onValueChange={(v) => setForm({ ...form, tag: v as Tag })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TAGS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Details</Label><Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <Button className="w-full" disabled={!form.title || !form.content || add.isPending} onClick={() => add.mutate()}>Post</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
