"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, ArrowLeft, MapPin, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { PointPickerModal } from "@/components/product/PointPickerModal";
import { useCart } from "@/lib/cart-context";
import { usePlannedCart } from "@/lib/planned-cart-context";
import { formatRupiah } from "@/lib/utils";
import { CartItem } from "@/types";

export default function CartPage() {
  const buyNow = useCart();
  const planned = usePlannedCart();
  const [tab, setTab] = useState<"BUY" | "PLANNED">("BUY");
  const [moveItem, setMoveItem] = useState<CartItem | null>(null);

  // Kelompokkan Keranjang Beli Sekarang per Point — tiap grup nanti jadi 1
  // Order terpisah pas checkout (lihat app/checkout/page.tsx).
  const groups = buyNow.items.reduce<Record<string, { pointId: string; pointName: string; pointCode: string; items: typeof buyNow.items }>>(
    (acc, item) => {
      if (!acc[item.pointId]) acc[item.pointId] = { pointId: item.pointId, pointName: item.pointName, pointCode: item.pointCode, items: [] };
      acc[item.pointId].items.push(item);
      return acc;
    },
    {}
  );
  const groupList = Object.values(groups);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-4 text-2xl font-bold">Keranjang</h1>

        <div className="mb-6 flex gap-1.5">
          <button
            onClick={() => setTab("BUY")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "BUY" ? "bg-primary text-white" : "bg-accent text-ink/70 hover:bg-primary-light"}`}
          >
            Beli Sekarang {buyNow.items.length > 0 && `(${buyNow.items.reduce((s, i) => s + i.qty, 0)})`}
          </button>
          <button
            onClick={() => setTab("PLANNED")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "PLANNED" ? "bg-primary text-white" : "bg-accent text-ink/70 hover:bg-primary-light"}`}
          >
            Rencana Belanja {planned.items.length > 0 && `(${planned.items.reduce((s, i) => s + i.qty, 0)})`}
          </button>
        </div>

        {tab === "BUY" &&
          (buyNow.items.length === 0 ? (
            <div className="space-y-4">
              <EmptyState icon="🛒" title="Belum ada yang mau dibeli sekarang" description="Klik 'Beli Sekarang' di halaman produk dan pilih Point-nya." />
              <div className="flex justify-center">
                <Link href="/products" className="btn-primary !py-2.5 !px-5 text-sm">
                  <ArrowLeft size={16} /> Mulai Belanja
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid items-start gap-6 md:grid-cols-3">
              <div className="space-y-4 md:col-span-2">
                <Link href="/products" className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <ArrowLeft size={14} /> Lanjutkan Belanja
                </Link>
                {groupList.map((g) => (
                  <div key={g.pointId} className="card space-y-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink/70">
                      <MapPin size={14} className="text-primary" /> {g.pointName} <span className="font-normal text-ink/40">({g.pointCode})</span>
                    </p>
                    {g.items.map((item) => (
                      <div key={`${item.productId}:${item.pointId}`} className="flex items-center gap-4">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-accent text-xl">
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
                            onClick={() => buyNow.updateQty(item.productId, item.pointId, item.qty - 1)}
                            aria-label="Kurangi jumlah"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm">{item.qty}</span>
                          <button className="px-3 py-1.5" onClick={() => buyNow.updateQty(item.productId, item.pointId, item.qty + 1)} aria-label="Tambah jumlah">
                            +
                          </button>
                        </div>
                        <button onClick={() => buyNow.removeItem(item.productId, item.pointId)} className="text-ink/40 hover:text-red-600" aria-label="Hapus dari keranjang">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="card sticky top-20 h-fit space-y-3">
                <p className="font-semibold">Ringkasan Belanja</p>
                <div className="flex justify-between text-sm">
                  <span className="text-ink/60">Subtotal ({buyNow.items.reduce((s, i) => s + i.qty, 0)} item)</span>
                  <span>{formatRupiah(buyNow.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-ink/50">
                  <span>Ongkir</span>
                  <span>Dihitung saat checkout</span>
                </div>
                {groupList.length > 1 && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Pesananmu dari {groupList.length} Point berbeda, nanti otomatis dipecah jadi {groupList.length} pesanan terpisah.
                  </p>
                )}
                <hr className="border-black/5" />
                <div className="flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span>{formatRupiah(buyNow.subtotal)}</span>
                </div>
                <Link href="/checkout" className="btn-primary mt-2 w-full">
                  Checkout
                </Link>
              </div>
            </div>
          ))}

        {tab === "PLANNED" &&
          (planned.items.length === 0 ? (
            <div className="space-y-4">
              <EmptyState icon="📝" title="Belum ada rencana belanja" description="Simpan produk yang mau dibeli nanti lewat tombol 'Simpan ke Rencana' di halaman produk." />
              <div className="flex justify-center">
                <Link href="/products" className="btn-primary !py-2.5 !px-5 text-sm">
                  <ArrowLeft size={16} /> Mulai Belanja
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink/50">Belum terikat Point — pilih Point-nya nanti pas dipindahkan ke Keranjang Beli Sekarang.</p>
              {planned.items.map((item) => (
                <div key={item.productId} className="card flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-accent text-xl">
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
                      onClick={() => planned.updateQty(item.productId, item.qty - 1)}
                      aria-label="Kurangi jumlah"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.qty}</span>
                    <button className="px-3 py-1.5" onClick={() => planned.updateQty(item.productId, item.qty + 1)} aria-label="Tambah jumlah">
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => setMoveItem(item)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-light px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"
                  >
                    Pindah ke Keranjang <ArrowRight size={13} />
                  </button>
                  <button onClick={() => planned.removeItem(item.productId)} className="text-ink/40 hover:text-red-600" aria-label="Hapus dari rencana">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ))}
      </main>
      <Footer />

      {moveItem && (
        <PointPickerModal
          productId={moveItem.productId}
          productName={moveItem.name}
          qty={moveItem.qty}
          onClose={() => setMoveItem(null)}
          onConfirm={(point) => {
            buyNow.addItem({
              productId: moveItem.productId,
              name: moveItem.name,
              price: moveItem.price,
              image: moveItem.image,
              qty: moveItem.qty,
              pointId: point.pointId,
              pointName: point.name,
              pointCode: point.code,
            });
            planned.removeItem(moveItem.productId);
            setMoveItem(null);
            setTab("BUY");
          }}
        />
      )}
    </>
  );
}
