import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo, MobileFrame } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — UniConnect" },
      { name: "description", content: "Choose a new password for your UniConnect account." },
      { property: "og:title", content: "Reset password — UniConnect" },
      { property: "og:description", content: "Choose a new password for your UniConnect account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  async function save() {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/home" });
  }
  return (
    <MobileFrame>
      <div className="flex flex-col items-center gap-4 px-6 py-16">
        <Logo className="h-16 w-16" />
        <h1 className="text-xl font-bold">Set a new password</h1>
        <Input type="password" placeholder="New password" className="h-12 rounded-xl bg-muted" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button className="h-12 w-full rounded-xl" onClick={save}>Update password</Button>
      </div>
    </MobileFrame>
  );
}
