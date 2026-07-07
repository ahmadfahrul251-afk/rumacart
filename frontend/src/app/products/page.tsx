"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { Product, Category } from "@/types";

// Next.js mewajibkan useSearchParams() dibungkus <Suspense>, karena nilai
// query string hanya diketahui di browser (bukan saat build/prerender).
export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageInner />
    </Suspense>
  );
}

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setProducts(null);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    api
      .get<{ items: Product[]; totalPages: number }>(`/products?${params.toString()}`)
      .then((res) => {
        setProducts(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(() => setProducts([]));
  }, [search, category, page]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold">Katalog Produk</h1>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="md:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setCategory(""); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${!category ? "bg-primary text-white" : "bg-accent"}`}
            >
              Semua
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategory(c.slug); setPage(1); }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${category === c.slug ? "bg-primary text-white" : "bg-accent"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {!products &&
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
          {products?.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {products?.length === 0 && (
          <EmptyState icon="🔍" title="Produk tidak ditemukan" description="Coba ubah kata kunci atau kategori pencarianmu." />
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`h-9 w-9 rounded-lg text-sm font-medium ${page === i + 1 ? "bg-primary text-white" : "bg-accent"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
