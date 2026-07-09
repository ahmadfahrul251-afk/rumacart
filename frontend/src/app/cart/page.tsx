"use client";

import Link from "next/link";
import { Trash2, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "@/lib/cart-context";
import { formatRupiah } from "@/lib/utils";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal } = useCart();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold">Keranjang Belanja</h1>

        {items.length === 0 ? (
          <div className="space-y-4">
            <EmptyState icon="🛒" title="Keranjangmu masih kosong" description="Yuk mulai belanja kebutuhan harianmu." />
            <div className="flex justify-center">
              <Link href="/products" className="btn-primary !py-2.5 !px-5 text-sm">
                <ArrowLeft size={16} /> Mulai Belanja
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid items-start gap-6 md:grid-cols-3">
            <div className="space-y-3 md:col-span-2">
              <Link href="/products" className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <ArrowLeft size={14} /> Lanjutkan Belanja
              </Link>
              {items.map((item) => (
                <div key={item.productId} className="card flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-accent text-2xl">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      "🛒"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-sm font-semibold text-primary">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center rounded-xl border border-black/10">
                    <button
                      className="px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={item.qty <= 1}
                      onClick={() => updateQty(item.productId, item.qty - 1)}
                      aria-label="Kurangi jumlah"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.qty}</span>
                    <button className="px-3 py-1.5" onClick={() => updateQty(item.productId, item.qty + 1)} aria-label="Tambah jumlah">+</button>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="text-ink/40 hover:text-red-600" aria-label="Hapus dari keranjang">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="card sticky top-20 h-fit space-y-3">
              <p className="font-semibold">Ringkasan Belanja</p>
              <div className="flex justify-between text-sm">
                <span className="text-ink/60">Subtotal ({items.reduce((s, i) => s + i.qty, 0)} item)</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-ink/50">
                <span>Ongkir</span>
                <span>Dihitung saat checkout</span>
              </div>
              <hr className="border-black/5" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <Link href="/checkout" className="btn-primary mt-2 w-full">Checkout</Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
