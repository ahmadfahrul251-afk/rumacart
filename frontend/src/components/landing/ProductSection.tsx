"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Product } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";

// Komponen generik dipakai ulang untuk "Produk Terlaris", "Produk Terbaru",
// dan "Rekomendasi" — hanya beda judul & query API.
export function ProductSection({ title, query }: { title: string; query?: string }) {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    api
      .get<{ items: Product[] }>(`/products?limit=8${query ? `&${query}` : ""}`)
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, [query]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold">{title}</h2>
        <Link href="/products" className="text-sm font-medium text-primary hover:underline">
          Lihat semua
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        {!products &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
        {products?.length === 0 && (
          <p className="col-span-full text-sm text-ink/50">Belum ada produk untuk ditampilkan.</p>
        )}
        {products?.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
