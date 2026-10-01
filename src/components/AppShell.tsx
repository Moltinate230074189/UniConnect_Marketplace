import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bell, MessageCircle, Search, Home, Store, ShoppingCart, Megaphone, User, CreditCard,
  Settings, ShieldCheck, LogOut, ChevronRight,
} from "lucide-react";
import { Logo, MobileFrame } from "@/components/Brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/data";
import { useCart } from "@/lib/cart";

export function useMe() {
  return useQuery(meQuery);
}

function initials(name?: string | null) {
  return (name || "U").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

export function ProfileAvatar({ onClick }: { onClick?: () => void }) {
  const { data } = useMe();
  return (
    <button onClick={onClick} aria-label="Open profile">
      <Avatar className="h-9 w-9 ring-2 ring-brand-foreground/70">
        <AvatarImage src={data?.profile?.avatar_url ?? undefined} />
        <AvatarFallback className="bg-navy text-xs font-bold text-navy-foreground">{initials(data?.profile?.full_name)}</AvatarFallback>
      </Avatar>
    </button>
  );
}

export function ProfileDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }
  const links = [
    { tab: "details", label: "Account Details", icon: User },
    { tab: "billing", label: "Billing info", icon: CreditCard },
    { tab: "settings", label: "Settings", icon: Settings },
    { tab: "security", label: "Password / Security", icon: ShieldCheck },
  ] as const;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85%] max-w-sm p-0">
        <SheetHeader className="bg-brand p-6 text-left text-brand-foreground">
          <SheetTitle className="sr-only">Profile</SheetTitle>
          <Avatar className="h-16 w-16 ring-4 ring-brand-foreground/40">
            <AvatarImage src={data?.profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-navy text-lg font-bold text-navy-foreground">{initials(data?.profile?.full_name)}</AvatarFallback>
          </Avatar>
          <p className="mt-3 text-lg font-bold">{data?.profile?.full_name}</p>
          <Badge className="w-fit bg-navy text-navy-foreground hover:bg-navy">{data?.role ?? "Student"}</Badge>
          <p className="text-sm opacity-90">{data?.user.email}</p>
        </SheetHeader>
        <nav className="p-3">
          {links.map((l) => (
            <Link key={l.tab} to="/account" search={{ tab: l.tab }} onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium hover:bg-muted">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><l.icon className="h-4 w-4" /></span>
              <span className="flex-1">{l.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          <button onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-medium text-destructive hover:bg-muted">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10"><LogOut className="h-4 w-4" /></span>
            Sign Out
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function BottomNav() {
  const cart = useCart();
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const items = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/shop", label: "Shop", icon: Store },
    { to: "/checkout", label: "Cart", icon: ShoppingCart, badge: count },
    { to: "/bulletin", label: "Board", icon: Megaphone },
  ] as const;
  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 backdrop-blur">
      {items.map((i) => (
        <Link key={i.to} to={i.to} className="relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground" activeProps={{ className: "text-brand-dark" }}>
          <i.icon className="h-5 w-5" />
          {i.label}
          {"badge" in i && i.badge > 0 && (
            <span className="absolute right-[28%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{i.badge}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children, header = "market" }: { children: React.ReactNode; header?: "market" | "tabs" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  return (
    <MobileFrame className="flex flex-col">
      {header === "market" ? (
        <header className="sticky top-0 z-30 bg-brand px-4 pb-4 pt-3 text-brand-foreground shadow-md">
          <div className="flex items-center gap-2">
            <Link to="/home" className="flex items-center gap-1.5">
              <span className="rounded-lg bg-card p-0.5"><Logo className="h-8 w-8" /></span>
              <span className="text-lg font-extrabold">UniConnect</span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <button aria-label="Inbox" className="relative" onClick={() => toast.info("Your inbox is empty — messaging is coming soon.")}>
                <MessageCircle className="h-6 w-6" />
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">2</span>
              </button>
              <Link to="/bulletin" aria-label="Notifications" className="relative">
                <Bell className="h-6 w-6" />
                <span className="absolute -right-0.5 top-0 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-brand" />
              </Link>
              <ProfileAvatar onClick={() => setOpen(true)} />
            </div>
          </div>
          <form
            className="relative mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/shop", search: { q: q || undefined } });
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-11 w-full rounded-xl bg-card pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-navy-light" />
          </form>
        </header>
      ) : (
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-card px-4 py-3">
          {([["/home", "HOME"], ["/shop", "SHOP"], ["/about", "ABOUT"], ["/contact", "CONTACT"]] as const).map(([to, l]) => (
            <Link key={to} to={to} className="text-xs font-bold tracking-wide text-muted-foreground" activeProps={{ className: "text-brand-dark" }}>{l}</Link>
          ))}
          <div className="ml-auto"><ProfileAvatar onClick={() => setOpen(true)} /></div>
        </header>
      )}
      <main className="flex-1">{children}</main>
      <BottomNav />
      <ProfileDrawer open={open} onOpenChange={setOpen} />
    </MobileFrame>
  );
}
