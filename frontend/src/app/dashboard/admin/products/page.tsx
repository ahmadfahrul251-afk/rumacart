"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, PackageCheck, Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Product } from "@/types";
import { formatRupiah } from "@/lib/utils";

function AdminProductsContent() {
  const { user } = useAuth();
  const isPusat = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const isAdminPoint = user?.role === "ADMIN_POINT";

  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [claimFilter, setClaimFilter] = useState<"ALL" | "UNCLAIMED" | "CLAIMED">("ALL");
  const [claimRowId, setClaimRowId] = useState(""); // baris yang lagi buka form klaim
  const [claimQty, setClaimQty] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  function loadProducts() {
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
  }

  useEffect(loadProducts, [search, page]);

  function myInventoryOf(p: Product) {
    return isAdminPoint ? p.inventory?.find((inv) => inv.pointId === user?.managedPointId) : undefined;
  }

  const visibleProducts =
    isAdminPoint && claimFilter !== "ALL"
      ? products?.filter((p) => (claimFilter === "CLAIMED" ? !!myInventoryOf(p) : !myInventoryOf(p)))
      : products;

  function openClaimForm(productId: string) {
    setError("");
    setClaimRowId(productId);
    setClaimQty("");
  }

  async function handleClaim(productId: string) {
    setError("");
    setClaiming(true);
    try {
      await api.post("/inventory/claim", { productId, qty: claimQty ? Number(claimQty) : undefined });
      setClaimRowId("");
      loadProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produk</h1>
        {isPusat && (
          <Link
            href="/dashboard/admin/products/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Tambah Produk
          </Link>
        )}
      </div>
      {isAdminPoint && (
        <p className="mb-4 text-sm text-ink/50">
          Produk diinput terpusat oleh Admin Pusat. Klik <strong>Klaim</strong> supaya produk masuk ke inventaris
          Point kamu — boleh langsung isi stok awal, atau nanti diisi lewat Transfer Stok / Purchase Order.
        </p>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="max-w-xs"
        />
        {isAdminPoint && (
          <div className="flex gap-1.5">
            {[
              { value: "ALL", label: "Semua" },
              { value: "UNCLAIMED", label: "Belum diklaim" },
              { value: "CLAIMED", label: "Sudah diklaim" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setClaimFilter(tab.value as typeof claimFilter)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  claimFilter === tab.value ? "bg-primary text-white" : "bg-accent text-ink/70 hover:bg-primary-light"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
            {visibleProducts?.map((p) => {
              const myInventory = myInventoryOf(p);
              const isClaimingThis = claimRowId === p.id;
              return (
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
                  <td className="py-2">{isAdminPoint ? myInventory?.stock ?? "-" : p.totalStock ?? "-"}</td>
                  <td className="py-2 text-right">
                    {isAdminPoint ? (
                      myInventory ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-primary-light px-3 py-1.5 text-xs font-medium text-primary">
                          <PackageCheck size={13} /> Sudah diklaim
                        </span>
                      ) : isClaimingThis ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            placeholder="Stok awal"
                            value={claimQty}
                            onChange={(e) => setClaimQty(e.target.value)}
                            className="!w-24 !py-1.5 text-xs"
                          />
                          <button
                            onClick={() => handleClaim(p.id)}
                            disabled={claiming}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {claiming ? <Loader2 size={13} className="animate-spin" /> : "Konfirmasi"}
                          </button>
                          <button
                            onClick={() => setClaimRowId("")}
                            disabled={claiming}
                            className="rounded-lg px-2 py-1.5 text-xs text-ink/50 hover:bg-accent"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openClaimForm(p.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
                        >
                          <PackageCheck size={13} /> Klaim
                        </button>
                      )
                    ) : (
                      <Link
                        href={`/dashboard/admin/products/${p.slug}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
                      >
                        <Pencil size={13} /> Edit
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {visibleProducts?.length === 0 && products && products.length > 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-ink/40">
                  Tidak ada produk di filter ini.
                </td>
              </tr>
            )}
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
