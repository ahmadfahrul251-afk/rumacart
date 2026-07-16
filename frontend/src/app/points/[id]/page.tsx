"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Clock, Phone, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { Product, PointPublic, LocationType } from "@/types";

const TYPE_LABEL: Record<LocationType, string> = { RDH: "RDH", MART: "Mart", POINT: "Point" };

export default function PointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [point, setPoint] = useState<PointPublic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api
      .get<PointPublic>(`/points/${id}/public`)
      .then(setPoint)
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    setProducts(null);
    const params = new URLSearchParams({ page: String(page), limit: "12" });
    if (search) params.set("search", search);
    api
      .get<{ items: Product[]; totalPages: number }>(`/points/${id}/products?${params.toString()}`)
      .then((res) => {
        setProducts(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(() => setProducts([]));
  }, [id, search, page]);

  if (notFound) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="mb-4 text-ink/60">Point ini tidak ditemukan atau sudah tidak aktif.</p>
          <Link href="/points" className="btn-primary !inline-flex !py-2.5 !px-5 text-sm">
            <ArrowLeft size={16} /> Lihat Semua Point
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link href="/points" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={14} /> Semua Point
        </Link>

        {!point ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="card mb-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="mb-1 inline-block rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
                  {TYPE_LABEL[point.type]}
                </span>
                <h1 className="text-xl font-bold">{point.name}</h1>
                <p className="text-sm text-ink/40">{point.code}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-ink/60">
              <p className="flex items-center gap-1.5"><MapPin size={14} /> {point.address}, {point.city}</p>
              {point.operatingHours && <p className="flex items-center gap-1.5"><Clock size={14} /> {point.operatingHours}</p>}
              {point.phone && <p className="flex items-center gap-1.5"><Phone size={14} /> {point.phone}</p>}
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Produk Ready di Lokasi Ini</h2>
          <Input
            placeholder="Cari produk di Point ini..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="max-w-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {!products && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
          {products?.map((p) => {
            if (!point) return null;
            // p.priceMin di sini sudah point-scoped (dari GET /points/:id/products),
            // jadi aman dipakai buat cek "belum diatur harga jual" walau produk
            // punya beberapa varian. `fixedPoint` (buat skip PointPickerModal)
            // cuma diisi kalau produknya cuma 1 varian — kalau lebih dari 1,
            // ProductCard otomatis arahkan ke halaman detail buat pilih varian dulu.
            if (p.priceMin == null) return null; // belum diatur harga jualnya, jangan ditampilkan bisa dibeli
            const variants = p.variants || [];
            const singleVariant = variants.length === 1 ? variants[0] : null;
            const cp = singleVariant?.currentPoint;
            return (
              <ProductCard
                key={p.id}
                product={p}
                fixedPoint={
                  singleVariant && cp
                    ? {
                        pointId: point.id,
                        name: point.name,
                        code: point.code,
                        price: cp.discountPrice ?? cp.sellPrice ?? cp.basePrice ?? p.priceMin,
                        originalPrice: cp.discountPrice != null ? cp.sellPrice : null,
                      }
                    : undefined
                }
              />
            );
          })}
        </div>

        {products?.length === 0 && (
          <EmptyState icon="📦" title="Belum ada produk ready di Point ini" description="Coba cari kata kunci lain atau cek Point lain." />
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
