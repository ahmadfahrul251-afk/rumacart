"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";
import { api } from "@/lib/api";
import { Product } from "@/types";

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const { ids } = useWishlist(); // dipakai supaya halaman ini auto-refresh saat toggle di halaman lain
  const router = useRouter();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.get<Product[]>("/wishlist").then(setProducts).catch(() => setProducts([]));
  }, [user, ids]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/profile" className="text-sm text-ink/60 hover:text-ink">Profil</Link>
          <span className="text-ink/30">/</span>
          <h1 className="text-2xl font-bold">Wishlist Saya</h1>
        </div>

        {!products && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
          </div>
        )}

        {products?.length === 0 && (
          <EmptyState
            icon="🤍"
            title="Wishlist masih kosong"
            description="Simpan produk favoritmu dengan klik ikon hati di halaman produk."
          />
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products?.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
