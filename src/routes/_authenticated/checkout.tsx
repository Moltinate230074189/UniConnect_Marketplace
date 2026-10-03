import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Truck, Store, Lock, Minus, Plus, ShoppingBag } from "lucide-react";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cart, useCart, zar } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { createPayfastPayment, getPayfastReadiness } from "@/lib/payfast.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Cart & checkout — UniConnect" },
      { name: "description", content: "Review your cart and check out securely." },
      { property: "og:title", content: "Cart & checkout — UniConnect" },
      { property: "og:description", content: "Review your cart and check out securely." },
    ],
  }),
  component: Checkout,
});

const CODES: Record<string, number> = { UNI50: 50, CAMPUS100: 100 };

function Checkout() {
  const items = useCart();
  const { data: me } = useMe();
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "South Africa", city: "", state: "", zip: "" });
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paying, setPaying] = useState(false);
  const createPayment = useServerFn(createPayfastPayment);
  const getReadiness = useServerFn(getPayfastReadiness);
  const { data: readiness } = useQuery({ queryKey: ["payfast-readiness"], queryFn: () => getReadiness() });

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = mode === "delivery" && items.length ? 110 : 0;
  const total = Math.max(0, subtotal + shipping - discount);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  function next() {
    if (!form.name || !form.email || !form.phone) return toast.error("Please fill in all required fields.");
    if (!agree) return toast.error("Please agree to the terms and conditions.");
    setStep(2);
  }

  async function pay() {
    if (!me) return;
    setPaying(true);
    try {
      const payment = await createPayment({ data: { fulfillmentType: mode, shippingAddress: form, discountCode: code.trim().toUpperCase() as "" | "UNI50" | "CAMPUS100", origin: window.location.origin, items: items.map((item) => ({ productId: item.id, quantity: item.quantity })) } });
      const paymentForm = document.createElement("form");
      paymentForm.method = "POST"; paymentForm.action = payment.url;
      Object.entries(payment.fields).forEach(([name, value]) => { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; paymentForm.appendChild(input); });
      document.body.appendChild(paymentForm);
      cart.clear();
      paymentForm.submit();
    } catch (error) {
      setPaying(false);
      toast.error(error instanceof Error ? error.message : "Payment could not be started.");
    }
  }

  if (!items.length)
    return (
      <AppShell header="tabs">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <ShoppingBag className="h-14 w-14 text-muted-foreground" />
          <h1 className="mt-4 text-lg font-bold">Your cart is empty</h1>
          <Button asChild className="mt-6 h-12 rounded-xl px-8"><Link to="/shop">Browse products</Link></Button>
        </div>
      </AppShell>
    );

  return (
    <AppShell header="tabs">
      <div className="p-4">
        <div className="mb-6 flex items-center justify-center gap-2 text-sm font-semibold">
          <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-brand-dark">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-brand-foreground">{step === 2 ? <Check className="h-4 w-4" /> : "1"}</span> Cart
          </button>
          <div className={cn("h-0.5 w-16", step === 2 ? "bg-brand" : "bg-border")} />
          <span className={cn("flex items-center gap-1.5", step === 2 ? "text-navy-light" : "text-muted-foreground")}>
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", step === 2 ? "bg-navy-light text-navy-foreground" : "bg-muted")}>●</span> Review
          </span>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Shipping Information</h2>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              {([["delivery", "Delivery", Truck], ["pickup", "Pickup", Store]] as const).map(([v, l, I]) => (
                <button key={v} onClick={() => setMode(v)} className={cn("flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold", mode === v ? "bg-card text-navy-light shadow" : "text-muted-foreground")}>
                  <I className="h-4 w-4" /> {l}
                </button>
              ))}
            </div>
            <Field label="Full name *"><Input value={form.name} onChange={set("name")} className="h-11 rounded-xl bg-muted" /></Field>
            <Field label="Email address *"><Input type="email" value={form.email} onChange={set("email")} placeholder={me?.user.email} className="h-11 rounded-xl bg-muted" /></Field>
            <Field label="Phone number *"><Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+27 82 000 0000" className="h-11 rounded-xl bg-muted" /></Field>
            {mode === "delivery" && (
              <>
                <Field label="Country">
                  <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted"><SelectValue /></SelectTrigger>
                    <SelectContent>{["South Africa", "Botswana", "Lesotho", "Namibia", "Eswatini"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="City"><Input value={form.city} onChange={set("city")} className="h-11 rounded-xl bg-muted" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="State/Province"><Input value={form.state} onChange={set("state")} className="h-11 rounded-xl bg-muted" /></Field>
                  <Field label="Zip code"><Input value={form.zip} onChange={set("zip")} className="h-11 rounded-xl bg-muted" /></Field>
                </div>
              </>
            )}
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" /> I have read and agree to the terms and conditions
            </label>
            <Button className="h-12 w-full rounded-xl" onClick={next}>Continue to review</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Review your cart</h2>
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                  <img src={i.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold">{i.title}</p>
                    <p className="text-sm font-bold text-brand-dark">{zar(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-1">
                    <button aria-label="Decrease" onClick={() => cart.setQty(i.id, i.quantity - 1)} className="rounded-md p-1 hover:bg-card"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-5 text-center text-sm font-semibold">{i.quantity}</span>
                    <button aria-label="Increase" onClick={() => cart.setQty(i.id, i.quantity + 1)} className="rounded-md p-1 hover:bg-card"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code (try UNI50)" className="h-11 rounded-xl bg-muted" />
              <Button variant="secondary" className="h-11 rounded-xl" onClick={() => {
                const d = CODES[code.trim().toUpperCase()];
                if (d) { setDiscount(d); toast.success(`Discount applied: -${zar(d)}`); } else toast.error("Invalid code");
              }}>Apply</Button>
            </div>
            <div className="space-y-2 rounded-xl bg-card p-4 text-sm shadow-sm">
              <Row l="Subtotal" v={zar(subtotal)} />
              <Row l="Shipping" v={zar(shipping)} />
              <Row l="Discount" v={`-${zar(discount)}`} className="text-brand-dark" />
              <div className="border-t pt-2"><Row l="Total" v={zar(total)} className="text-base font-extrabold" /></div>
            </div>
            <Button className="h-12 w-full rounded-xl text-base" disabled={paying || readiness?.configured !== true} onClick={pay}>{paying ? "Opening PayFast…" : readiness?.configured === false ? "PayFast setup required" : "Pay securely with PayFast"}</Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5 shrink-0" /> {readiness?.configured === false ? "Payments stay disabled until merchant credentials are added." : `Secure checkout · PayFast ${readiness?.sandbox ? "sandbox" : "live"}`}</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Row({ l, v, className }: { l: string; v: string; className?: string }) {
  return <div className={cn("flex justify-between", className)}><span>{l}</span><span>{v}</span></div>;
}
