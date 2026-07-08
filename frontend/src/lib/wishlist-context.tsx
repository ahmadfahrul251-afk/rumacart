"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";
import { Product } from "@/types";

interface WishlistContextValue {
  ids: Set<string>;
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

// Wishlist disimpan di server (database), bukan localStorage, karena harus
// nyambung ke akun user (bisa dicek dari device manapun). Context ini cuma
// nyimpen daftar ID produk di memory supaya ikon ❤️ di banyak ProductCard
// sekaligus bisa update tanpa panggil API berkali-kali.
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    api
      .get<Product[]>("/wishlist")
      .then((products) => setIds(new Set(products.map((p) => p.id))))
      .catch(() => setIds(new Set()))
      .finally(() => setLoading(false));
  }, [user]);

  async function toggle(productId: string) {
    if (!user) return; // dipanggil dari komponen yang sudah cek login dulu

    const wishlisted = ids.has(productId);
    // Update tampilan duluan (optimistic), baru kirim ke server —
    // supaya klik ikon hati terasa instan, tidak nunggu network.
    setIds((prev) => {
      const next = new Set(prev);
      wishlisted ? next.delete(productId) : next.add(productId);
      return next;
    });

    try {
      if (wishlisted) {
        await api.delete(`/wishlist/${productId}`);
      } else {
        await api.post("/wishlist", { productId });
      }
    } catch {
      // gagal → kembalikan ke kondisi semula
      setIds((prev) => {
        const next = new Set(prev);
        wishlisted ? next.add(productId) : next.delete(productId);
        return next;
      });
    }
  }

  return (
    <WishlistContext.Provider value={{ ids, isWishlisted: (id) => ids.has(id), toggle, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist harus dipakai di dalam <WishlistProvider>");
  return ctx;
}
