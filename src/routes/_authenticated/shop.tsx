import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesQuery, productsQuery } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/shop")({
  validateSearch: z.object({ category: z.string().optional(), q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Shop all products — UniConnect" },
      { name: "description", content: "Browse every listing on your campus marketplace." },
      { property: "og:title", content: "Shop all products — UniConnect" },
      { property: "og:description", content: "Browse every listing on your campus marketplace." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { category, q } = Route.useSearch();
  const { data: cats } = useQuery(categoriesQuery);
  const { data, isLoading } = useQuery(productsQuery({ category, q }));
  return (
    <AppShell>
      <div className="flex gap-2 overflow-x-auto px-4 py-4">
        <Link to="/shop" search={{ q }} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", !category ? "border-brand bg-brand text-brand-foreground" : "bg-card")}>All</Link>
        {cats?.map((c) => (
          <Link key={c.id} to="/shop" search={{ category: c.slug, q }} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", category === c.slug ? "border-brand bg-brand text-brand-foreground" : "bg-card")}>{c.name}</Link>
        ))}
      </div>
      {q && <p className="px-4 pb-2 text-sm text-muted-foreground">Results for “{q}”</p>}
      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
        {data?.map((p) => <ProductCard key={p.id} p={p} />)}
        {data && data.length === 0 && <p className="col-span-2 py-12 text-center text-sm text-muted-foreground">No products found.</p>}
      </div>
    </AppShell>
  );
}
