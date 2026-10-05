import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const checkoutSchema = z.object({
  fulfillmentType: z.enum(["delivery", "pickup"]),
  shippingAddress: z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().min(5), country: z.string(), city: z.string(), state: z.string(), zip: z.string() }),
  discountCode: z.enum(["", "UNI50", "CAMPUS100"]),
  origin: z.string().url(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1),
});

// PayFast's public sandbox test merchant — used until real credentials are added.
const SANDBOX_DEFAULTS = { merchantId: "10000100", merchantKey: "46f0cd694581a", passphrase: "jt7NOE43FZPn" };

function payfastConfig() {
  const hasOwn = !!(process.env['PAYFAST_MERCHANT_ID'] && process.env['PAYFAST_MERCHANT_KEY']);
  const sandbox = !hasOwn || process.env['PAYFAST_SANDBOX'] !== "false";
  return hasOwn
    ? { merchantId: process.env['PAYFAST_MERCHANT_ID'], merchantKey: process.env['PAYFAST_MERCHANT_KEY'], passphrase: process.env['PAYFAST_PASSPHRASE'], sandbox }
    : { ...SANDBOX_DEFAULTS, sandbox: true };
}

export const getPayfastReadiness = createServerFn({ method: "GET" }).handler(async () => {
  const config = payfastConfig();
  return { configured: !!(config.merchantId && config.merchantKey && config.passphrase), sandbox: config.sandbox };
});

export const createPayfastPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => checkoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const config = payfastConfig();
    if (!config.merchantId || !config.merchantKey || !config.passphrase) throw new Error("PayFast is not configured yet.");

    const ids = data.items.map((item) => item.productId);
    const { data: products, error: productError } = await context.supabase.from("products").select("id, title, price, stock").in("id", ids);
    if (productError) throw productError;
    const lines = data.items.map((item) => {
      const product = products?.find((candidate) => candidate.id === item.productId);
      if (!product || product.stock < item.quantity) throw new Error("A cart item is unavailable in the requested quantity.");
      return { product, quantity: item.quantity, price: Number(product.price) };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const shippingFee = data.fulfillmentType === "delivery" ? 110 : 0;
    const discount = data.discountCode === "UNI50" ? 50 : data.discountCode === "CAMPUS100" ? 100 : 0;
    const total = Math.max(0, subtotal + shippingFee - discount);

    const { data: order, error: orderError } = await context.supabase.from("orders").insert({
      buyer_id: context.userId, fulfillment_type: data.fulfillmentType, shipping_address: data.shippingAddress,
      subtotal, shipping_fee: shippingFee, discount, total, status: "pending", payment_provider: "payfast",
    }).select("id").single();
    if (orderError) throw orderError;
    const { error: itemError } = await context.supabase.from("order_items").insert(lines.map((line) => ({ order_id: order.id, product_id: line.product.id, quantity: line.quantity, price: line.price })));
    if (itemError) throw itemError;

    const base = data.origin.replace(/\/$/, "");
    const fields: Record<string, string> = {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: `${base}/payment-return?order=${order.id}`,
      cancel_url: `${base}/payment-cancelled?order=${order.id}`,
      notify_url: `${base}/api/public/payfast-itn`,
      name_first: data.shippingAddress.name.split(/\s+/)[0] ?? "UniConnect",
      email_address: data.shippingAddress.email,
      m_payment_id: order.id,
      amount: total.toFixed(2),
      item_name: `UniConnect order ${order.id.slice(0, 8).toUpperCase()}`,
    };
    const { payfastSignature } = await import("./payfast.server");
    fields['signature'] = payfastSignature(fields, config.passphrase);
    return { orderId: order.id, url: config.sandbox ? "https://sandbox.payfast.co.za/eng/process" : "https://www.payfast.co.za/eng/process", fields };
  });