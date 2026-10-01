import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — UniConnect" },
      { name: "description", content: "Get in touch with the UniConnect team." },
      { property: "og:title", content: "Contact — UniConnect" },
      { property: "og:description", content: "Get in touch with the UniConnect team." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [msg, setMsg] = useState("");
  return (
    <AppShell header="tabs">
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-extrabold">Contact us</h1>
        <p className="text-sm text-muted-foreground">Questions about an order or listing? Send us a message.</p>
        <Input placeholder="Your email" className="h-11 rounded-xl bg-muted" />
        <Textarea rows={5} placeholder="Message" value={msg} onChange={(e) => setMsg(e.target.value)} className="rounded-xl bg-muted" />
        <Button className="h-11 w-full rounded-xl" onClick={() => { toast.success("Thanks! We'll get back to you soon."); setMsg(""); }}>Send message</Button>
      </div>
    </AppShell>
  );
}
