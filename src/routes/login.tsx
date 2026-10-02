import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo, MobileFrame, SocialIcon } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { socialSignIn } from "@/lib/auth-actions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — UniConnect" },
      { name: "description", content: "Log in to UniConnect, your campus marketplace." },
      { property: "og:title", content: "Log in — UniConnect" },
      { property: "og:description", content: "Log in to UniConnect, your campus marketplace." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return toast.error(error.message);
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find((item) => item.status === "verified");
      if (!factor) { setLoading(false); return toast.error("Your two-factor method could not be found."); }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      setLoading(false);
      if (challengeError) return toast.error(challengeError.message);
      setFactorId(factor.id);
      setChallengeId(challenge.id);
      return;
    }
    setLoading(false);
    navigate({ to: "/home" });
  }

  async function verifyCode() {
    if (!factorId || !challengeId || code.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    setLoading(false);
    if (error) return toast.error("That authentication code is not valid.");
    navigate({ to: "/home" });
  }

  async function sendReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Check your inbox for a reset link.");
    setForgotOpen(false);
  }

  return (
    <MobileFrame>
      <div className="px-6 py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="h-20 w-20" />
          <h1 className="text-2xl font-extrabold text-navy">
            Uni<span className="text-brand">Connect</span>
          </h1>
          <p className="mt-4 text-lg font-bold">Hi, Welcome! 👋</p>
          <p className="text-sm text-muted-foreground">Login to continue</p>
        </div>

        {factorId ? (
          <div className="mt-8 space-y-5 text-center">
            <div><h2 className="font-bold">Two-factor verification</h2><p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p></div>
            <InputOTP maxLength={6} value={code} onChange={setCode} containerClassName="justify-center">
              <InputOTPGroup>{Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} className="h-11 w-11" />)}</InputOTPGroup>
            </InputOTP>
            <Button type="button" disabled={loading || code.length !== 6} onClick={verifyCode} className="h-12 w-full rounded-xl">{loading ? "Verifying…" : "Verify and continue"}</Button>
          </div>
        ) : <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" required placeholder="you@uni.ac.za" className="h-12 rounded-xl bg-muted" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required placeholder="••••••••" className="h-12 rounded-xl bg-muted" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <Checkbox defaultChecked /> Remember me
            </label>
            <button type="button" onClick={() => setForgotOpen(true)} className="font-medium text-destructive hover:underline">
              Forgot password?
            </button>
          </div>
          <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base">
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>}

        {!factorId && <><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> Or with <div className="h-px flex-1 bg-border" />
        </div>
        <div className="flex justify-center gap-4">
          {(["facebook", "google", "instagram"] as const).map((p) => (
            <button key={p} onClick={() => socialSignIn(p)} aria-label={`Continue with ${p}`} className="flex h-12 w-16 items-center justify-center rounded-xl border bg-card shadow-sm transition hover:shadow-md">
              <SocialIcon name={p} />
            </button>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-brand-dark hover:underline">Sign up</Link>
        </p>
        </>}
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Reset your password</DialogTitle></DialogHeader>
          <Input type="email" placeholder="you@uni.ac.za" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
          <Button onClick={sendReset}>Send reset link</Button>
        </DialogContent>
      </Dialog>
    </MobileFrame>
  );
}
