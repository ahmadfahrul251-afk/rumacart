"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BuyNowItem } from "@/types";

interface CartContextValue {
  items: BuyNowItem[];
  addItem: (item: BuyNowItem) => void;
  updateQty: (variantId: string, pointId: string, qty: number) => void;
  removeItem: (variantId: string, pointId: string) => void;
  removeByPoint: (pointId: string) => void;
  clearCart: () => void;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "rumacart_cart";

// Keranjang "Beli Sekarang" — disimpan di localStorage (bukan database) supaya
// tetap ada walau belum login ("guest cart"). Bedanya dari sebelumnya: tiap
// item sekarang terikat ke 1 Point (dipilih customer saat "Tambah ke
// Keranjang" di halaman produk, bukan lagi pas checkout). Karena itu, 1 varian
// yang sama bisa muncul 2x di keranjang kalau diambil dari 2 Point berbeda —
// makanya kunci baris berubah dari cuma `variantId` jadi `variantId+pointId`.
// (Round 18: kunci per varian, bukan per produk, karena harga/stok kini per varian.)
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BuyNowItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setItems(JSON.parse(saved));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(item: BuyNowItem) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId && i.pointId === item.pointId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId && i.pointId === item.pointId ? { ...i, qty: i.qty + item.qty } : i
        );
      }
      return [...prev, item];
    });
  }

  function updateQty(variantId: string, pointId: string, qty: number) {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => !(i.variantId === variantId && i.pointId === pointId))
        : prev.map((i) => (i.variantId === variantId && i.pointId === pointId ? { ...i, qty } : i))
    );
  }

  function removeItem(variantId: string, pointId: string) {
    setItems((prev) => prev.filter((i) => !(i.variantId === variantId && i.pointId === pointId)));
  }

  // Dipakai checkout: setelah 1 grup Point berhasil jadi Order, hapus grup itu
  // dari keranjang (biar kalau grup lain gagal, yang sudah sukses tidak dobel).
  function removeByPoint(pointId: string) {
    setItems((prev) => prev.filter((i) => i.pointId !== pointId));
  }

  function clearCart() {
    setItems([]);
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, removeByPoint, clearCart, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>");
  return ctx;
}
