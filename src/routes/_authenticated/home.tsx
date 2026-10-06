import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { CategoryIcon, ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesQuery, productsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Marketplace — UniConnect" },
      { name: "description", content: "Find and sell everything on campus." },
      { property: "og:title", content: "Marketplace — UniConnect" },
      { property: "og:description", content: "Find and sell everything on campus." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: cats } = useQuery(categoriesQuery);
  const { data: products, isLoading } = useQuery(productsQuery({ limit: 6 }));
  return (
    <AppShell>
      <section className="m-4 overflow-hidden rounded-2xl bg-navy p-6 text-navy-foreground shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">Campus marketplace</p>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight">FIND &amp; SELL EVERYTHING ON CAMPUS</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/shop" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-bold text-brand-foreground transition hover:bg-brand-dark">
            Browse all products
          </Link>
          <Link to="/dashboard" className="inline-flex h-11 items-center rounded-xl border border-navy-foreground/40 px-5 text-sm font-bold text-navy-foreground transition hover:bg-navy-foreground/10">
            Sell something
          </Link>
        </div>
      </section>

      <section className="px-4">
        <h3 className="mb-3 text-base font-bold">Categories</h3>
        <div className="grid grid-cols-3 gap-3">
          {cats?.map((c) => (
            <Link key={c.id} to="/shop" search={{ category: c.slug }} className="flex flex-col items-center gap-2 rounded-xl bg-muted p-3 text-center transition hover:bg-accent">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-brand-foreground shadow"><CategoryIcon name={c.icon_name} className="h-5 w-5" /></span>
              <span className="text-[11px] font-semibold leading-tight">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">Recently Added</h3>
          <Link to="/shop" className="text-xs font-semibold text-brand-dark">See all</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          {products?.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </AppShell>
  );
}
