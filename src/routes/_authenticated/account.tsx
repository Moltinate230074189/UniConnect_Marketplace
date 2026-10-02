import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CAMPUSES } from "@/lib/data";
import { zar } from "@/lib/cart";
import { cn } from "@/lib/utils";

const tabs = ["details", "billing", "settings", "security"] as const;
export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: z.object({ tab: z.enum(tabs).optional() }),
  head: () => ({
    meta: [
      { title: "My account — UniConnect" },
      { name: "description", content: "Manage your UniConnect profile, billing and security." },
      { property: "og:title", content: "My account — UniConnect" },
      { property: "og:description", content: "Manage your UniConnect profile, billing and security." },
    ],
  }),
  component: Account,
});

const LABELS = { details: "Account", billing: "Billing", settings: "Settings", security: "Security" };

function Account() {
  const { tab = "details" } = Route.useSearch();
  return (
    <AppShell header="tabs">
      <div className="p-4">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
          {tabs.map((t) => (
            <Link key={t} to="/account" search={{ tab: t }} className={cn("rounded-lg py-2 text-center text-xs font-semibold", tab === t ? "bg-card text-navy-light shadow" : "text-muted-foreground")}>{LABELS[t]}</Link>
          ))}
        </div>
        <div className="mt-5">
          {tab === "details" && <Details />}
          {tab === "billing" && <Billing />}
          {tab === "settings" && <SettingsTab />}
          {tab === "security" && <Security />}
        </div>
      </div>
    </AppShell>
  );
}

function Details() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [campus, setCampus] = useState("");
  useEffect(() => { setName(me?.profile?.full_name ?? ""); setCampus(me?.profile?.campus_name ?? ""); }, [me]);
  async function save() {
    if (!me) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, campus_name: campus }).eq("id", me.user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["me"] });
  }
  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl bg-muted" /></div>
      <div className="space-y-1.5"><Label>Email</Label><Input value={me?.user.email ?? ""} disabled className="h-11 rounded-xl bg-muted" /></div>
      <div className="space-y-1.5"><Label>Campus</Label>
        <Select value={campus} onValueChange={setCampus}>
          <SelectTrigger className="h-11 rounded-xl bg-muted"><SelectValue placeholder="Select campus" /></SelectTrigger>
          <SelectContent>{CAMPUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">Role: <span className="font-semibold text-foreground">{me?.role}</span></p>
      <Button className="h-11 w-full rounded-xl" onClick={save}>Save changes</Button>
    </div>
  );
}

function Billing() {
  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-3">
      <h2 className="font-bold">Order history</h2>
      {orders?.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
      {orders?.map((o) => (
        <div key={o.id} className="flex items-center justify-between rounded-xl border bg-card p-3 text-sm shadow-sm">
          <div>
            <p className="font-semibold">#{o.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-ZA")} · {o.fulfillment_type}</p>
          </div>
          <div className="text-right">
            <p className="font-bold">{zar(Number(o.total))}</p>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold capitalize text-brand-dark">{o.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-3">
      {["Order updates", "New listings in my categories", "Community board posts"].map((l) => (
        <label key={l} className="flex items-center justify-between rounded-xl border bg-card p-4 text-sm"><span>{l}</span><Switch defaultChecked /></label>
      ))}
    </div>
  );
}

function Security() {
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [factor, setFactor] = useState<{ id: string; qr: string } | null>(null);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setVerifiedFactorId(data?.totp.find((item) => item.status === "verified")?.id ?? null));
  }, []);
  async function change() {
    if (pw.length < 8) return toast.error("New password must be at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as { password: string });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setCurrent(""); setPw("");
  }
  async function toggle2fa(enabled: boolean) {
    setBusy(true);
    if (!enabled && verifiedFactorId) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
      setBusy(false);
      if (error) return toast.error(error.message);
      setVerifiedFactorId(null);
      return toast.success("Two-factor authentication disabled");
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "UniConnect authenticator" });
    setBusy(false);
    if (error) return toast.error(error.message);
    setFactor({ id: data.id, qr: data.totp.qr_code });
  }
  async function verifyEnrollment() {
    if (!factor || code.length !== 6) return;
    setBusy(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challengeError) { setBusy(false); return toast.error(challengeError.message); }
    const { error } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
    setBusy(false);
    if (error) return toast.error("That authentication code is not valid.");
    setVerifiedFactorId(factor.id); setFactor(null); setCode("");
    toast.success("Two-factor authentication enabled");
  }
  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between rounded-xl border bg-card p-4">
        <div><p className="text-sm font-semibold">Two-Factor Authentication</p><p className="text-xs text-muted-foreground">Extra protection at sign-in</p></div>
         <Switch checked={!!verifiedFactorId} disabled={busy} onCheckedChange={toggle2fa} />
      </label>
      <h2 className="pt-2 font-bold">Change password</h2>
      <div className="space-y-1.5"><Label>Current password</Label><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-11 rounded-xl bg-muted" /></div>
      <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11 rounded-xl bg-muted" /></div>
      <Button className="h-11 w-full rounded-xl" onClick={change}>Update password</Button>
      <Dialog open={!!factor} onOpenChange={(open) => { if (!open) setFactor(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Set up an authenticator</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app, then enter its 6-digit code.</p>
          {factor && <div className="mx-auto rounded-xl bg-card p-3" dangerouslySetInnerHTML={{ __html: factor.qr }} />}
          <InputOTP maxLength={6} value={code} onChange={setCode} containerClassName="justify-center">
            <InputOTPGroup>{Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} className="h-11 w-11" />)}</InputOTPGroup>
          </InputOTP>
          <Button disabled={busy || code.length !== 6} onClick={verifyEnrollment}>{busy ? "Verifying…" : "Verify and enable"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
