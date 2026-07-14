"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CartItem } from "@/types";

interface PlannedCartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
}

const PlannedCartContext = createContext<PlannedCartContextValue | undefined>(undefined);
const STORAGE_KEY = "rumacart_planned_cart";

// Keranjang "Rencana Belanja" — daftar produk yang mau dibeli NANTI, mirip
// wishlist tapi ada jumlah (qty). Sengaja TIDAK terikat ke Point sama sekali
// (beda dari Keranjang Beli Sekarang) — Point baru dipilih pas item ini
// dipindahkan ke Keranjang Beli Sekarang lewat tombol "Pindah ke Keranjang"
// di halaman /cart.
export function PlannedCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setItems(JSON.parse(saved));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(item: CartItem) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) => (i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i));
      }
      return [...prev, item];
    });
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.productId !== productId) : prev.map((i) => (i.productId === productId ? { ...i, qty } : i))
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <PlannedCartContext.Provider value={{ items, addItem, updateQty, removeItem, clearCart, subtotal }}>
      {children}
    </PlannedCartContext.Provider>
  );
}

export function usePlannedCart() {
  const ctx = useContext(PlannedCartContext);
  if (!ctx) throw new Error("usePlannedCart harus dipakai di dalam <PlannedCartProvider>");
  return ctx;
}
