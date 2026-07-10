"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Product } from "@/types";
import { formatRupiah } from "@/lib/utils";

function AdminProductsContent() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setProducts(null);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) params.set("search", search);
    api
      .get<{ items: Product[]; totalPages: number }>(`/products?${params.toString()}`)
      .then((res) => {
        setProducts(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(() => setProducts([]));
  }, [search, page]);

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produk</h1>
      </div>

      <Input
        placeholder="Cari produk..."
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="mb-4 max-w-xs"
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink/50">
            <tr>
              <th className="pb-2">Foto</th>
              <th className="pb-2">Nama</th>
              <th className="pb-2">SKU</th>
              <th className="pb-2">Harga</th>
              <th className="pb-2">Stok</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {!products &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="py-2"><Skeleton className="h-10 w-full" /></td>
                </tr>
              ))}
            {products?.map((p) => (
              <tr key={p.id} className="border-t border-black/5">
                <td className="py-2">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-lg">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      "🛒"
                    )}
                  </div>
                </td>
                <td className="py-2">{p.name}</td>
                <td className="py-2 text-ink/50">{p.sku}</td>
                <td className="py-2">{formatRupiah(p.discountPrice ?? p.sellPrice)}</td>
                <td className="py-2">{p.totalStock ?? "-"}</td>
                <td className="py-2 text-right">
                  <Link
                    href={`/dashboard/admin/products/${p.slug}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
                  >
                    <Pencil size={13} /> Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
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
    </div>
  );
}

export default function AdminProductsPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <AdminProductsContent />
      </div>
    </RoleGuard>
  );
}
