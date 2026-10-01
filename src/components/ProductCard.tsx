import { Link } from "@tanstack/react-router";
import { zar } from "@/lib/cart";

type P = { id: string; title: string; price: number; images: string[]; condition: string | null };

export function ProductCard({ p }: { p: P }) {
  return (
    <Link to="/product/$id" params={{ id: p.id }} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-square overflow-hidden bg-muted">
        <img src={p.images[0]} alt={p.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{p.condition}</p>
        <p className="mt-1.5 text-base font-extrabold text-brand-dark">{zar(p.price)}</p>
      </div>
    </Link>
  );
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  return <DynamicIcon name={name} className={className} />;
}

import { BookOpen, Smartphone, Shirt, Dumbbell, FlaskConical, Package } from "lucide-react";
const ICONS: Record<string, typeof Package> = { BookOpen, Smartphone, Shirt, Dumbbell, FlaskConical };
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Package;
  return <I className={className} />;
}
