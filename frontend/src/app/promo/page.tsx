"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, Ticket } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { Voucher } from "@/types";
import { formatRupiah } from "@/lib/utils";

export default function PromoPage() {
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    api.get<Voucher[]>("/vouchers").then(setVouchers).catch(() => setVouchers([]));
  }, []);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-2xl font-bold">Promo & Voucher</h1>
        <p className="mb-6 text-sm text-ink/60">Pakai kode voucher di bawah ini saat checkout untuk dapat potongan harga.</p>

        {!vouchers && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        )}

        {vouchers?.length === 0 && (
          <EmptyState icon="🎟️" title="Belum ada promo aktif" description="Pantau terus halaman ini, promo baru akan muncul di sini." />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {vouchers?.map((v) => (
            <div key={v.id} className="card flex flex-col gap-3 border-2 border-dashed border-primary/30">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
                    <Ticket size={20} />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-primary">
                      {v.discountType === "PERCENT" ? `Diskon ${v.discountAmount}%` : `Potongan ${formatRupiah(v.discountAmount)}`}
                    </p>
                    {v.discountType === "PERCENT" && v.maxDiscount && (
                      <p className="text-xs text-ink/50">Maks. potongan {formatRupiah(v.maxDiscount)}</p>
                    )}
                  </div>
                </div>
              </div>

              {v.description && <p className="text-sm text-ink/60">{v.description}</p>}

              <div className="text-xs text-ink/50">
                {v.minPurchase > 0 && <p>Min. belanja {formatRupiah(v.minPurchase)}</p>}
                {v.expiresAt && (
                  <p>Berlaku sampai {new Date(v.expiresAt).toLocaleDateString("id-ID", { dateStyle: "long" })}</p>
                )}
              </div>

              <button
                onClick={() => copyCode(v.code)}
                className="mt-auto flex items-center justify-between rounded-xl border border-black/10 bg-accent px-4 py-2.5"
              >
                <span className="font-mono text-sm font-semibold tracking-wide">{v.code}</span>
                {copiedCode === v.code ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600"><Check size={14} /> Disalin</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary"><Copy size={14} /> Salin</span>
                )}
              </button>
            </div>
          ))}
        </div>

        {vouchers && vouchers.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/products" className="btn-primary !inline-flex !py-2.5 !px-5 text-sm">Mulai Belanja</Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
