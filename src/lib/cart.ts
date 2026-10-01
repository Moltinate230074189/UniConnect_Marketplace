import { useSyncExternalStore } from "react";

export type CartItem = { id: string; title: string; price: number; image: string; quantity: number };

const KEY = "uniconnect-cart";
let items: CartItem[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const EMPTY: CartItem[] = [];

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    items = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    items = [];
  }
}
function set(next: CartItem[]) {
  items = next;
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export const cart = {
  add(item: Omit<CartItem, "quantity">, qty = 1) {
    load();
    const existing = items.find((i) => i.id === item.id);
    set(
      existing
        ? items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i))
        : [...items, { ...item, quantity: qty }],
    );
  },
  setQty(id: string, quantity: number) {
    load();
    set(quantity <= 0 ? items.filter((i) => i.id !== id) : items.map((i) => (i.id === id ? { ...i, quantity } : i)));
  },
  clear() {
    set([]);
  },
};

export function useCart() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      load();
      return items;
    },
    () => EMPTY,
  );
}

export const zar = (n: number) =>
  "R" + Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
