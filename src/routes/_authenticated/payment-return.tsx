import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { z } from "zod";
import { Clock, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { confirmSandboxReturn } from "@/lib/payfast.functions";

export const Route = createFileRoute("/_authenticated/payment-return")({
  validateSearch: z.object({ order: z.string().uuid() }),
  head: () => ({ meta: [{ title: "Payment status — UniConnect" }, { name: "description", content: "Check your UniConnect payment status." }, { property: "og:title", content: "Payment status — UniConnect" }, { property: "og:description", content: "Check your UniConnect payment status." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PaymentReturn,
});

function PaymentReturn() {
  const { order } = Route.useSearch();
  const confirm = useServerFn(confirmSandboxReturn);
  const { data, refetch } = useQuery({
    queryKey: ["payment-status", order], refetchInterval: (q) => (q.state.data?.status === "paid" ? false : 3000),
    queryFn: async () => { const { data, error } = await supabase.from("orders").select("status, total").eq("id", order).single(); if (error) throw error; return data; },
  });
  useEffect(() => { confirm({ data: { orderId: order } }).then(() => refetch()).catch(() => {}); }, [order]);
  const paid = data?.status === "paid";
  return (
    <AppShell header="tabs">
      <div className="px-6 py-16 text-center">
        {paid ? <CheckCircle2 className="mx-auto h-16 w-16 text-brand" /> : <Clock className="mx-auto h-16 w-16 text-muted-foreground" />}
        <h1 className="mt-4 text-2xl font-extrabold">{paid ? "Payment confirmed" : "Confirming your payment"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{paid ? "Your order is paid and visible in your account." : "PayFast is sending us the final result. This page updates automatically."}</p>
        <Button asChild className="mt-6"><Link to="/account" search={{ tab: "billing" }}>View my orders</Link></Button>
      </div>
    </AppShell>
  );
}
