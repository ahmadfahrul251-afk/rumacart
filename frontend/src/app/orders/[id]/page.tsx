"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { formatRupiah } from "@/lib/utils";

const POLL_INTERVAL_MS = 8000;
const ONGOING_STATUSES = ["PENDING", "PROCESSED", "PREPARED", "PICKED_UP", "SHIPPED"];

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function downloadInvoice() {
    if (!order) return;
    setDownloading(true);
    try {
      await api.openFile(`/orders/${order.id}/invoice`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  }

  function load() {
    api
      .get<Order>(`/orders/${id}/track`)
      .then(setOrder)
      .catch(() => setNotFound(true));
  }

  useEffect(() => {
    if (!authLoading && !user) router.push(`/login?redirect=/orders/${id}`);
  }, [authLoading, user, id, router]);

  useEffect(load, [id]);

  // Selagi pesanan masih berjalan, halaman ini cek ulang statusnya berkala
  // supaya timeline otomatis update begitu ada perubahan — tanpa refresh manual.
  useEffect(() => {
    if (order && ONGOING_STATUSES.includes(order.status)) {
      pollRef.current = setInterval(load, POLL_INTERVAL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [order?.status, id]);

  if (notFound) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <p className="mb-4 text-ink/60">Pesanan tidak ditemukan, atau bukan milikmu.</p>
          <Link href="/orders" className="btn-primary !inline-flex !py-2.5 !px-5 text-sm">Lihat Riwayat Pesanan</Link>
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Skeleton className="h-96 w-full" />
        </main>
        <Footer />
      </>
    );
  }

  const isPaid = order.payment?.status === "PAID";
  const needsPayment = order.paymentMethod !== "COD" && order.payment?.status === "PENDING" && order.status !== "CANCELLED";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <button onClick={() => router.push("/orders")} className="mb-4 text-sm text-ink/60 hover:text-ink">
          ← Riwayat Pesanan
        </button>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <p className="text-sm text-ink/60">
              {new Date(order.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadInvoice}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              <FileText size={15} /> {downloading ? "Membuka..." : "Unduh Invoice"}
            </button>
            {needsPayment && (
              <Link href={`/orders/${order.id}/payment`} className="btn-primary !py-2 !px-4 text-sm">
                Lanjutkan Pembayaran
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <OrderTracker order={order} />

            <div className="card">
              <p className="mb-3 font-semibold">Item Pesanan</p>
              <div className="space-y-2">
                {order.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm">
                    <span className="text-ink/70">
                      {it.variant?.product?.name || "Produk"}
                      {it.variant?.name && it.variant.name !== "Default" && <> ({it.variant.name})</>} x{it.qty}
                    </span>
                    <span>{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>
              <hr className="my-3 border-black/5" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-ink/60"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>
                <div className="flex justify-between text-ink/60"><span>Ongkir</span><span>{formatRupiah(order.shippingCost)}</span></div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-primary"><span>Diskon</span><span>-{formatRupiah(order.discount)}</span></div>
                )}
                <div className="flex justify-between pt-1 font-semibold"><span>Total</span><span>{formatRupiah(order.total)}</span></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {order.address && (
              <div className="card">
                <p className="mb-2 text-xs font-medium text-ink/50">ALAMAT PENGIRIMAN</p>
                <p className="text-sm font-medium">{order.address.recipientName}</p>
                <p className="text-sm text-ink/60">{order.address.fullAddress}, {order.address.city}</p>
                <p className="text-sm text-ink/60">{order.address.phone}</p>
              </div>
            )}

            <div className="card">
              <p className="mb-2 text-xs font-medium text-ink/50">PEMBAYARAN</p>
              <p className="text-sm">{order.paymentMethod}</p>
              <p className={`mt-1 text-sm font-medium ${isPaid ? "text-primary" : "text-secondary"}`}>
                {isPaid ? "Lunas" : order.payment?.status === "AWAITING_VERIFICATION" ? "Menunggu Verifikasi" : "Menunggu Pembayaran"}
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
