import { createFileRoute } from "@tanstack/react-router";
import { payfastSignature } from "@/lib/payfast.server";

async function sourceIsPayfast(request: Request, sandbox: boolean) {
  const sourceIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!sourceIp) return false;
  const hostname = sandbox ? "sandbox.payfast.co.za" : "www.payfast.co.za";
  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, { headers: { accept: "application/dns-json" } });
  if (!response.ok) return false;
  const result = await response.json() as { Answer?: Array<{ data: string }> };
  return result.Answer?.some((answer) => answer.data === sourceIp) ?? false;
}

export const Route = createFileRoute("/api/public/payfast-itn")({
  server: { handlers: { POST: async ({ request }) => {
    const raw = await request.text();
    const params = new URLSearchParams(raw);
    const fields = Object.fromEntries(params.entries());
    const orderId = fields['m_payment_id'];
    const signature = fields['signature'];
    const passphrase = process.env['PAYFAST_PASSPHRASE'];
    const sandbox = process.env['PAYFAST_SANDBOX'] !== "false";
    if (!orderId || !signature || !passphrase || payfastSignature(fields, passphrase) !== signature) return new Response("Invalid signature", { status: 400 });
    if (!(await sourceIsPayfast(request, sandbox))) return new Response("Invalid source", { status: 403 });

    const validation = await fetch(sandbox ? "https://sandbox.payfast.co.za/eng/query/validate" : "https://www.payfast.co.za/eng/query/validate", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: raw,
    });
    if ((await validation.text()).trim() !== "VALID") return new Response("Invalid payment", { status: 400 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("id, buyer_id, total, status").eq("id", orderId).maybeSingle();
    if (!order || Math.abs(Number(order.total) - Number(fields['amount_gross'])) > 0.01) return new Response("Amount mismatch", { status: 400 });
    const status = fields['payment_status'] === "COMPLETE" ? "paid" : fields['payment_status'] === "FAILED" ? "cancelled" : "pending";
    await supabaseAdmin.from("orders").update({ status, provider_payment_id: fields['pf_payment_id'] || null }).eq("id", order.id);
    if (status === "paid") await supabaseAdmin.from("notifications").insert({ user_id: order.buyer_id, title: "Payment received", body: `Your order ${order.id.slice(0, 8).toUpperCase()} has been paid.`, href: "/account?tab=billing" });
    return new Response("OK", { status: 200 });
  } } },
});