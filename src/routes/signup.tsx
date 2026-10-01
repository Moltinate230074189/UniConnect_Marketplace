import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo, MobileFrame, SocialIcon } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { socialSignIn } from "@/lib/auth-actions";
import { CAMPUSES, isUniEmail } from "@/lib/data";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create an account — UniConnect" },
      { name: "description", content: "Join UniConnect with your university email." },
      { property: "og:title", content: "Create an account — UniConnect" },
      { property: "og:description", content: "Join UniConnect with your university email." },
    ],
  }),
  component: Signup,
});

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campus, setCampus] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isUniEmail(email)) return toast.error("Please use your university email (e.g. name@uct.ac.za).");
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (!campus) return toast.error("Select your school / campus.");
    if (!agree) return toast.error("Please accept the Terms of service and Privacy policy.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { campus_name: campus } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  return (
    <MobileFrame>
      <div className="px-6 py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="h-16 w-16" />
          <h1 className="text-2xl font-extrabold text-navy">Create an account!</h1>
        </div>

        {sent ? (
          <div className="mt-10 rounded-2xl bg-brand-soft p-6 text-center">
            <p className="font-bold text-brand-dark">Check your email ✉️</p>
            <p className="mt-2 text-sm text-muted-foreground">We sent a confirmation link to {email}. Click it to activate your account.</p>
            <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-navy-light hover:underline">Back to log in</Link>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {([["facebook", "Continue with facebook"], ["apple", "Continue with Apple"], ["google", "Continue with Google"]] as const).map(([p, label]) => (
                <button key={p} onClick={() => socialSignIn(p)} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border bg-card text-sm font-semibold shadow-sm transition hover:shadow-md">
                  <SocialIcon name={p} /> {label}
                </button>
              ))}
            </div>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> Or <div className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" required placeholder="name@university.ac.za" className="h-12 rounded-xl bg-muted" value={email} onChange={(e) => setEmail(e.target.value)} />
                {email && !isUniEmail(email) && <p className="text-xs text-destructive">Use a university email ending in .ac.za or .edu</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required placeholder="At least 8 characters" className="h-12 rounded-xl bg-muted" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>School / Campus</Label>
                <Select value={campus} onValueChange={setCampus}>
                  <SelectTrigger className="h-12 rounded-xl bg-muted"><SelectValue placeholder="Select your campus" /></SelectTrigger>
                  <SelectContent>{CAMPUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
                <span>I agree to the <span className="font-semibold text-navy-light">Terms of service</span> and <span className="font-semibold text-navy-light">Privacy policy</span>.</span>
              </label>
              <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base">{loading ? "Creating account…" : "Sign up"}</Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="font-semibold text-brand-dark hover:underline">Log in</Link>
            </p>
          </>
        )}
      </div>
    </MobileFrame>
  );
}
