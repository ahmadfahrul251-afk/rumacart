"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Category } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";

const ICONS: Record<string, string> = {
  sembako: "🍚", minuman: "🥤", "makanan-instan": "🍜", "frozen-food": "🧊",
  snack: "🍪", "perawatan-tubuh": "🧴", "perawatan-bayi": "🍼", "peralatan-dapur": "🍳",
  "kebersihan-rumah": "🧹", "sayur-segar": "🥬", "buah-segar": "🍎", "bumbu-dapur": "🌶️",
  "obat-otc": "💊", "produk-herbal": "🌿",
};

export function Categories() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="mb-5 text-xl font-bold">Kategori</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {!categories &&
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        {categories?.slice(0, 16).map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className="card flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <span className="text-2xl">{ICONS[cat.slug] || "🛒"}</span>
            <span className="text-xs font-medium leading-tight">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
