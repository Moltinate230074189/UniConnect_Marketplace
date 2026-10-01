import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo, MobileFrame } from "@/components/Brand";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UniConnect — Campus Marketplace" },
      { name: "description", content: "Buy, sell and connect with students, faculty and vendors on your campus." },
      { property: "og:title", content: "UniConnect — Campus Marketplace" },
      { property: "og:description", content: "Buy, sell and connect with students, faculty and vendors on your campus." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      navigate({ to: data.session ? "/home" : "/login", replace: true });
    }, 2200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <MobileFrame className="flex flex-col items-center justify-center bg-background">
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-8 text-center animate-in fade-in zoom-in-95 duration-700">
        <Logo className="h-36 w-36" />
        <h1 className="text-4xl font-extrabold tracking-tight text-navy">
          Uni<span className="text-brand">Connect</span>
        </h1>
        <p className="text-base font-medium text-muted-foreground">Buy. Sell. Connect. Together.</p>
        <Link to="/login" className="mt-8 text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">
          Get started →
        </Link>
      </div>
    </MobileFrame>
  );
}
