import { useEffect, useState, useSyncExternalStore } from "react";

// -------- Cart --------
export type CartItem = {
  slug: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  qty: number;
};

const CART_KEY = "gzaf.cart.v1";
const WISH_KEY = "gzaf.wishlist.v1";

type Store<T> = {
  get: () => T;
  set: (next: T) => void;
  subscribe: (fn: () => void) => () => void;
};

function createStore<T>(key: string, initial: T): Store<T> {
  const listeners = new Set<() => void>();
  let value = initial;

  const read = () => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  };

  // Load once on client
  if (typeof window !== "undefined") {
    value = read();
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        value = read();
        listeners.forEach((l) => l());
      }
    });
  }

  return {
    get: () => value,
    set: (next) => {
      value = next;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(next));
      }
      listeners.forEach((l) => l());
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const cartStore = createStore<CartItem[]>(CART_KEY, []);
const wishStore = createStore<string[]>(WISH_KEY, []);

function useStore<T>(store: Store<T>, serverSnapshot: T): T {
  return useSyncExternalStore(store.subscribe, store.get, () => serverSnapshot);
}

// Hydration-safe cart hook
export function useCart() {
  const items = useStore(cartStore, [] as CartItem[]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const add = (item: Omit<CartItem, "qty"> & { qty?: number }) => {
    const current = cartStore.get();
    const key = `${item.slug}::${item.size ?? ""}`;
    const idx = current.findIndex((c) => `${c.slug}::${c.size ?? ""}` === key);
    if (idx >= 0) {
      const next = [...current];
      next[idx] = { ...next[idx], qty: next[idx].qty + (item.qty ?? 1) };
      cartStore.set(next);
    } else {
      cartStore.set([...current, { ...item, qty: item.qty ?? 1 }]);
    }
  };

  const remove = (slug: string, size?: string) => {
    cartStore.set(
      cartStore
        .get()
        .filter((c) => !(c.slug === slug && (c.size ?? "") === (size ?? ""))),
    );
  };

  const setQty = (slug: string, size: string | undefined, qty: number) => {
    if (qty <= 0) return remove(slug, size);
    cartStore.set(
      cartStore
        .get()
        .map((c) =>
          c.slug === slug && (c.size ?? "") === (size ?? "") ? { ...c, qty } : c,
        ),
    );
  };

  const clear = () => cartStore.set([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return { items: hydrated ? items : [], hydrated, add, remove, setQty, clear, subtotal, count };
}

export function useWishlist() {
  const slugs = useStore(wishStore, [] as string[]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const toggle = (slug: string) => {
    const current = wishStore.get();
    wishStore.set(
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );
  };
  const has = (slug: string) => slugs.includes(slug);
  const remove = (slug: string) => wishStore.set(wishStore.get().filter((s) => s !== slug));

  return { slugs: hydrated ? slugs : [], hydrated, toggle, has, remove };
}
