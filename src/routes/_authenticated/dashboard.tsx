import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Package, Trash2, TrendingUp, ShoppingBag, Megaphone, ImagePlus } from "lucide-react";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery } from "@/lib/data";
import { zar } from "@/lib/cart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My dashboard — UniConnect" },
      { name: "description", content: "Sell items, manage listings, track sales and post announcements on UniConnect." },
      { property: "og:title", content: "My dashboard — UniConnect" },
      { property: "og:description", content: "Sell items, manage listings, track sales and post announcements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  if (!me) return <AppShell><div className="p-8 text-center text-muted-foreground">Loading…</div></AppShell>;
  const role = me.role;
  const title = role === "Vendor" ? "Vendor dashboard" : role === "Faculty" ? "Faculty dashboard" : "Student dashboard";
  const intro = role === "Vendor" ? "List your products, manage stock and track your sales." : role === "Faculty" ? "Post official campus announcements and list lab or project equipment." : "Track your orders and sell your second-hand items to other students.";
  return (
    <AppShell>
      <div className="space-y-6 p-4">
        <div className="rounded-2xl bg-navy p-6 text-navy-foreground">
          <Badge className="bg-brand text-brand-foreground hover:bg-brand">{role}</Badge>
          <h1 className="mt-2 text-2xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm opacity-80">{intro}</p>
        </div>
        {role === "Vendor" && <VendorStats userId={me.user.id} />}
        {role === "Faculty" && <AnnouncementComposer userId={me.user.id} name={me.profile?.full_name ?? "Faculty"} />}
        {role !== "Vendor" && <MyOrders userId={me.user.id} />}
        <div className="grid gap-6 md:grid-cols-2">
          <ProductForm userId={me.user.id} heading={role === "Vendor" ? "Add a product" : role === "Faculty" ? "List equipment" : "Sell an item"} />
          <MyListings userId={me.user.id} />
        </div>
        {role === "Vendor" && <Sales userId={me.user.id} />}
      </div>
    </AppShell>
  );
}

const card = "rounded-xl border bg-card p-4 shadow-sm";

function useSales(userId: string) {
  return useQuery({
    queryKey: ["sales", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("id, quantity, price, products!inner(title, vendor_id), orders(status, created_at, fulfillment_type)").eq("products.vendor_id", userId);
      if (error) throw error;
      return (data ?? []).sort((a, b) => (b.orders?.created_at ?? "").localeCompare(a.orders?.created_at ?? ""));
    },
  });
}

function VendorStats({ userId }: { userId: string }) {
  const { data: sales = [] } = useSales(userId);
  const { data: listings = [] } = useListings(userId);
  const paid = sales.filter((s) => s.orders?.status === "paid" || s.orders?.status === "completed");
  const revenue = paid.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const stats = [
    { label: "Active listings", value: listings.length, icon: Package },
    { label: "Items sold", value: paid.reduce((s, i) => s + i.quantity, 0), icon: ShoppingBag },
    { label: "Revenue", value: zar(revenue), icon: TrendingUp },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={card}>
          <s.icon className="h-5 w-5 text-brand-dark" />
          <p className="mt-2 text-xl font-extrabold">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function Sales({ userId }: { userId: string }) {
  const { data: sales = [] } = useSales(userId);
  return (
    <section className={card}>
      <h2 className="mb-3 font-bold">Recent sales</h2>
      {!sales.length ? <p className="text-sm text-muted-foreground">No sales yet. Once a buyer pays, orders appear here.</p> : (
        <div className="divide-y">
          {sales.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2 text-sm">
              <div><p className="font-semibold">{s.quantity} × {s.products?.title}</p><p className="text-xs text-muted-foreground">{s.orders?.fulfillment_type} · {s.orders?.created_at ? new Date(s.orders.created_at).toLocaleDateString() : ""}</p></div>
              <div className="text-right"><p className="font-bold">{zar(Number(s.price) * s.quantity)}</p><Badge variant={s.orders?.status === "paid" ? "default" : "secondary"}>{s.orders?.status}</Badge></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MyOrders({ userId }: { userId: string }) {
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, total, status, created_at").eq("buyer_id", userId).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });
  return (
    <section className={card}>
      <h2 className="mb-3 font-bold">My recent orders</h2>
      {!orders.length ? <p className="text-sm text-muted-foreground">No orders yet. <Link to="/shop" className="font-semibold text-brand-dark">Start shopping</Link></p> : (
        <div className="divide-y">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between py-2 text-sm">
              <span>#{o.id.slice(0, 8).toUpperCase()} · {new Date(o.created_at).toLocaleDateString()}</span>
              <span className="flex items-center gap-2 font-bold">{zar(Number(o.total))}<Badge variant={o.status === "paid" ? "default" : "secondary"}>{o.status}</Badge></span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function useListings(userId: string) {
  return useQuery({
    queryKey: ["my-listings", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, title, price, stock, images").eq("vendor_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

function MyListings({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useListings(userId);
  async function remove(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message.includes("foreign key") ? "This item has orders, so it can't be deleted. Set stock to 0 instead." : error.message);
    toast.success("Listing removed");
    qc.invalidateQueries();
  }
  return (
    <section className={card}>
      <h2 className="mb-3 font-bold">My listings ({data.length})</h2>
      {!data.length ? <p className="text-sm text-muted-foreground">You haven't listed anything yet.</p> : (
        <div className="space-y-2">
          {data.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
              {p.images[0] ? <img src={p.images[0]} alt="" className="h-12 w-12 rounded-md object-cover" /> : <div className="h-12 w-12 rounded-md bg-muted" />}
              <Link to="/product/$id" params={{ id: p.id }} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">{zar(Number(p.price))} · {p.stock} in stock</p>
              </Link>
              <Button size="icon" variant="ghost" aria-label="Delete listing" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Resize photos in the browser and store them as compact JPEG data so no file storage is needed.
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 700 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * scale; c.height = img.height * scale;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.75));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const emptyForm = { title: "", description: "", price: "", stock: "1", category: "", condition: "New", size: "one-size", colors: "", material: "" };

function ProductForm({ userId, heading }: { userId: string; heading: string }) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [f, setF] = useState(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function addImages(files: FileList | null) {
    if (!files) return;
    const next = await Promise.all(Array.from(files).slice(0, 4 - images.length).map(resizeImage));
    setImages([...images, ...next]);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(f.price);
    if (!f.title.trim() || !f.category || !(price > 0)) return toast.error("Add a title, category and a price above R0.");
    if (!images.length) return toast.error("Add at least one photo.");
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      vendor_id: userId, category_id: f.category, title: f.title.trim(), description: f.description.trim() || null, price,
      stock: Math.max(1, parseInt(f.stock) || 1), condition: f.condition, size: f.size || "one-size", material: f.material || null,
      colors: f.colors.split(",").map((c) => c.trim()).filter(Boolean), images,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Your item is now live in the shop!");
    setF(emptyForm); setImages([]);
    qc.invalidateQueries();
  }
  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <h2 className="font-bold">{heading}</h2>
      <div className="space-y-1.5"><Label>Title *</Label><Input value={f.title} onChange={set("title")} placeholder="e.g. Casio scientific calculator" /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={f.description} onChange={set("description")} rows={3} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Price (R) *</Label><Input type="number" min="1" step="0.01" value={f.price} onChange={set("price")} /></div>
        <div className="space-y-1.5"><Label>Stock</Label><Input type="number" min="1" value={f.stock} onChange={set("stock")} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Category *</Label>
          <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
            <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Condition</Label>
          <Select value={f.condition} onValueChange={(v) => setF({ ...f, condition: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["New", "Used - Like New", "Used - Good", "Used - Fair"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label>Size</Label><Input value={f.size} onChange={set("size")} /></div>
        <div className="space-y-1.5"><Label>Material</Label><Input value={f.material} onChange={set("material")} /></div>
        <div className="space-y-1.5"><Label>Colours</Label><Input value={f.colors} onChange={set("colors")} placeholder="black, red" /></div>
      </div>
      <div className="space-y-1.5">
        <Label>Photos * (up to 4)</Label>
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button type="button" key={i} onClick={() => setImages(images.filter((_, j) => j !== i))} title="Remove photo"><img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" /></button>
          ))}
          {images.length < 4 && (
            <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:bg-muted">
              <ImagePlus className="h-5 w-5" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
            </label>
          )}
        </div>
      </div>
      <Button type="submit" disabled={saving} className="h-11 w-full rounded-xl">{saving ? "Publishing…" : "Publish listing"}</Button>
    </form>
  );
}

function AnnouncementComposer({ userId, name }: { userId: string; name: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { data: posts = [] } = useQuery({
    queryKey: ["my-posts", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bulletin_posts").select("id, title, created_at").eq("author_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error("Add a title and message.");
    const { error } = await supabase.from("bulletin_posts").insert({ author_id: userId, author_name: `${name} (Faculty)`, title: title.trim(), content: content.trim(), tag: "announcement" });
    if (error) return toast.error(error.message);
    toast.success("Announcement posted to the Board");
    setTitle(""); setContent("");
    qc.invalidateQueries();
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={post} className={`${card} space-y-3`}>
        <h2 className="flex items-center gap-2 font-bold"><Megaphone className="h-4 w-4 text-brand-dark" /> Official announcement</h2>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. Lab closed on Friday" />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Message to students" />
        <Button type="submit" className="w-full rounded-xl">Post to Board</Button>
      </form>
      <section className={card}>
        <h2 className="mb-3 font-bold">My announcements ({posts.length})</h2>
        {!posts.length ? <p className="text-sm text-muted-foreground">Nothing posted yet.</p> : posts.map((p) => (
          <p key={p.id} className="border-b py-2 text-sm last:border-0"><span className="font-semibold">{p.title}</span> <span className="text-xs text-muted-foreground">· {new Date(p.created_at).toLocaleDateString()}</span></p>
        ))}
        <Link to="/bulletin" className="mt-2 inline-block text-sm font-semibold text-brand-dark">Open the Board →</Link>
      </section>
    </div>
  );
}
