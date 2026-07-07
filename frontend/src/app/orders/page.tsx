"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { formatRupiah } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Diproses", PROCESSED: "Diproses", PREPARED: "Disiapkan",
  PICKED_UP: "Diambil Gudang", SHIPPED: "Dikirim", COMPLETED: "Selesai", CANCELLED: "Dibatalkan",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    api.get<Order[]>("/orders/my").then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold">Riwayat Pesanan</h1>

        {!orders && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        )}

        {orders?.length === 0 && (
          <EmptyState icon="📦" title="Belum ada pesanan" description="Yuk mulai belanja kebutuhan harianmu di RumaCart." />
        )}

        <div className="space-y-3">
          {orders?.map((o) => (
            <div key={o.id} className="card">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">{o.orderNumber}</p>
                <Badge tone={o.status}>{STATUS_LABEL[o.status] || o.status}</Badge>
              </div>
              <p className="text-sm text-ink/60">{new Date(o.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
              <div className="mt-2 space-y-1">
                {o.items.map((it) => (
                  <p key={it.id} className="text-sm text-ink/70">
                    {it.product?.name || "Produk"} x{it.qty}
                  </p>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
                <span className="text-sm text-ink/60">Total</span>
                <span className="font-semibold text-primary">{formatRupiah(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
