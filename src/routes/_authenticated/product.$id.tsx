import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { productQuery } from "@/lib/data";
import { cart, zar } from "@/lib/cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/product/$id")({
  head: () => ({
    meta: [
      { title: "Product details — UniConnect" },
      { name: "description", content: "View product details, specs and reviews on UniConnect." },
      { property: "og:title", content: "Product details — UniConnect" },
      { property: "og:description", content: "View product details, specs and reviews on UniConnect." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: p, isLoading } = useQuery(productQuery(id));
  const [idx, setIdx] = useState(0);
  const [color, setColor] = useState<string | null>(null);

  if (isLoading) return <AppShell header="tabs"><Skeleton className="m-4 aspect-square rounded-2xl" /></AppShell>;
  if (!p) return <AppShell header="tabs"><p className="p-8 text-center text-muted-foreground">Product not found.</p></AppShell>;

  const item = { id: p.id, title: p.title, price: Number(p.price), image: p.images[0] ?? "" };
  const selectedColor = color ?? p.colors?.[0];

  return (
    <AppShell header="tabs">
      <div className="p-4">
        <div className="overflow-hidden rounded-2xl bg-muted">
          <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${idx * 100}%)` }}>
            {p.images.map((src) => <img key={src} src={src} alt={p.title} className="aspect-square w-full shrink-0 object-cover" />)}
          </div>
        </div>
        {p.images.length > 1 && (
          <div className="mt-3 flex gap-2">
            {p.images.map((src, i) => (
              <button key={src} onClick={() => setIdx(i)} className={cn("h-16 w-16 overflow-hidden rounded-xl border-2", i === idx ? "border-brand" : "border-transparent")}>
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <h1 className="mt-5 text-lg font-bold leading-snug">{p.title}</h1>
        <p className="mt-1 text-2xl font-extrabold text-brand-dark">{zar(Number(p.price))}</p>
        <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-xl border-navy-light text-navy-light" onClick={() => { cart.add(item); toast.success("Added to cart"); }}>Add to cart</Button>
          <Button className="h-12 rounded-xl" onClick={() => { cart.add(item); navigate({ to: "/checkout" }); }}>Buy now</Button>
        </div>

        <Accordion type="multiple" defaultValue={["specs"]} className="mt-5 rounded-xl border bg-card px-4">
          <AccordionItem value="specs" className="border-b-0">
            <AccordionTrigger className="font-bold">Specifications</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Material</span><span className="font-medium">{p.material}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Condition</span><span className="font-medium">{p.condition}</span></div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Color: <span className="font-medium text-foreground">{selectedColor}</span></p>
                <div className="flex flex-wrap gap-2">
                  {p.colors?.map((c) => (
                    <button key={c} onClick={() => setColor(c)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", selectedColor === c ? "border-navy bg-navy text-navy-foreground" : "bg-muted")}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Size</span><span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{p.size}</span></div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <section className="mt-5 rounded-2xl bg-brand-soft p-4">
          <h2 className="font-bold text-brand-dark">Customer Reviews</h2>
          {p.reviews.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>}
          <div className="mt-3 space-y-3">
            {p.reviews.map((r) => (
              <div key={r.id} className="rounded-xl bg-card p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-brand text-brand-foreground">{(r.reviewer_name ?? "U")[0]}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <p className="flex items-center gap-1 text-sm font-semibold">
                      {r.reviewer_name}
                      {r.is_verified_purchase && <span className="flex items-center gap-0.5 text-xs font-medium text-brand-dark"><BadgeCheck className="h-3.5 w-3.5" /> Verified user</span>}
                    </p>
                    <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-chart-4 text-chart-4" : "text-border")} />)}</div>
                  </div>
                </div>
                <p className="mt-2 text-sm">{r.comment}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
