"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Copy, QrCode, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { formatRupiah } from "@/lib/utils";

// Rekening/QRIS dummy untuk simulasi — tidak ada payment gateway sungguhan.
const BANK_ACCOUNT = { bank: "Bank RumaCart", number: "8801 2026 0709", holder: "PT RumaCart Indonesia Jaya" };

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function load() {
    api
      .get<Order>(`/orders/${id}`)
      .then(setOrder)
      .catch(() => setOrder(null));
  }

  useEffect(() => {
    if (!authLoading && !user) router.push(`/login?redirect=/orders/${id}/payment`);
  }, [authLoading, user, id, router]);

  useEffect(load, [id]);

  async function handleConfirm() {
    setConfirming(true);
    setError("");
    try {
      await api.patch(`/orders/${id}/pay`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  function copyAccount() {
    navigator.clipboard.writeText(BANK_ACCOUNT.number.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
          <Skeleton className="h-72 w-full" />
        </main>
        <Footer />
      </>
    );
  }

  const isPaid = order.payment?.status === "PAID";
  const isCod = order.paymentMethod === "COD";

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="card text-center">
          {isPaid ? (
            <>
              <CheckCircle2 size={48} className="mx-auto mb-3 text-green-600" />
              <h1 className="text-xl font-bold">Pembayaran Berhasil</h1>
              <p className="mt-1 text-sm text-ink/60">
                Terima kasih! Pesanan {order.orderNumber} sudah lunas dan akan segera diproses.
              </p>
            </>
          ) : isCod ? (
            <>
              <Wallet size={40} className="mx-auto mb-3 text-primary" />
              <h1 className="text-xl font-bold">Bayar di Tempat (COD)</h1>
              <p className="mt-1 text-sm text-ink/60">
                Siapkan uang tunai sebesar <span className="font-semibold text-ink">{formatRupiah(order.total)}</span> saat kurir mengantar pesanan {order.orderNumber}.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">Selesaikan Pembayaran</h1>
              <p className="mt-1 text-sm text-ink/60">Pesanan {order.orderNumber} menunggu pembayaran.</p>

              <div className="mt-5 rounded-2xl bg-accent p-5 text-left">
                {order.paymentMethod === "TRANSFER" ? (
                  <>
                    <p className="mb-3 text-xs font-medium text-ink/50">TRANSFER BANK</p>
                    <p className="text-sm text-ink/60">{BANK_ACCOUNT.bank}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-lg font-bold tracking-wide">{BANK_ACCOUNT.number}</p>
                      <button onClick={copyAccount} className="rounded-lg p-1.5 hover:bg-white" aria-label="Salin nomor rekening">
                        <Copy size={15} />
                      </button>
                    </div>
                    {copied && <p className="mt-1 text-xs text-green-600">Nomor rekening disalin</p>}
                    <p className="mt-1 text-sm text-ink/60">a.n. {BANK_ACCOUNT.holder}</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2 text-center">
                    <QrCode size={80} className="text-ink/70" />
                    <p className="text-xs text-ink/50">Scan QRIS ini dengan aplikasi e-wallet kamu (simulasi)</p>
                  </div>
                )}
                <div className="mt-4 border-t border-black/10 pt-3 text-center">
                  <p className="text-xs text-ink/50">Total yang harus dibayar</p>
                  <p className="text-xl font-bold text-primary">{formatRupiah(order.total)}</p>
                </div>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <Button onClick={handleConfirm} disabled={confirming} className="mt-5 w-full">
                {confirming ? "Memproses..." : order.paymentMethod === "TRANSFER" ? "Saya Sudah Transfer" : "Bayar Sekarang"}
              </Button>
              <p className="mt-2 text-xs text-ink/40">
                *Simulasi pembayaran untuk keperluan demo — tidak ada transaksi uang sungguhan.
              </p>
            </>
          )}

          <button onClick={() => router.push("/orders")} className="mt-4 text-sm font-medium text-primary hover:underline">
            Lihat Riwayat Pesanan
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
