"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Trash2, Printer, ScanBarcode } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { Product, ProductVariant, Order } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface PosLine { variantId: string; name: string; price: number; qty: number; }
// Round 18: hasil cari & scan sekarang selalu resolve ke VARIAN spesifik
// (bukan produk) — 1 produk dengan beberapa rasa/ukuran muncul sebagai
// beberapa baris hasil pencarian terpisah.
interface VariantResult { product: Product; variant: ProductVariant; }

function displayName(product: Product, variant: ProductVariant) {
  return !variant.name || variant.name === "Default" ? product.name : `${product.name} (${variant.name})`;
}

function KasirContent() {
  const { user } = useAuth();
  // Kasir normal terkunci ke Point-nya sendiri (harga & stok harus dari lokasi
  // ini). ADMIN/SUPER_ADMIN yang buka POS ini tanpa managedPointId (jarang,
  // biasanya buat testing) fallback ke pencarian umum + auto-pilih Point.
  const myPointId = user?.managedPointId || undefined;
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<VariantResult[]>([]);
  const [lines, setLines] = useState<PosLine[]>([]);
  const [payment, setPayment] = useState<"COD" | "TRANSFER" | "EWALLET">("COD");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanError, setScanError] = useState("");
  const [printing, setPrinting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fokus otomatis ke kolom cari/scan supaya kasir bisa langsung scan
  // barcode berikutnya tanpa perlu klik ke input lagi.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  async function handleSearch(q: string) {
    setSearch(q);
    setScanError("");
    if (!q) return setResults([]);
    // Pencarian point-scoped: harga & stok yang tampil selalu punya Kasir sendiri.
    const res = myPointId
      ? await api.get<{ items: Product[] }>(`/points/${myPointId}/products?search=${encodeURIComponent(q)}&limit=6`)
      : await api.get<{ items: Product[] }>(`/products?search=${encodeURIComponent(q)}&limit=6`);
    const flat: VariantResult[] = res.items.flatMap((p) => (p.variants || []).map((v) => ({ product: p, variant: v })));
    setResults(flat.slice(0, 8));
  }

  // Scanner barcode biasanya mengetik kode lalu langsung "Enter" secara otomatis.
  // Saat Enter ditekan, coba cari varian lewat barcode persis dulu (bukan cari nama).
  async function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = search.trim();
    if (!code) return;
    try {
      const qs = myPointId ? `?pointId=${myPointId}` : "";
      const variant = await api.get<ProductVariant>(`/variants/barcode/${encodeURIComponent(code)}${qs}`);
      if (!variant.product) throw new Error("Data produk induk varian ini tidak lengkap");
      addLine(variant.product, variant);
    } catch {
      setScanError(`Barcode "${code}" tidak ditemukan.`);
    }
  }

  function priceOf(v: ProductVariant): number | null {
    // Hasil /points/:id/products & /variants/barcode?pointId= sama-sama pakai
    // field currentPoint (lihat point.controller.ts / variant.controller.ts).
    if (v.currentPoint) return v.currentPoint.discountPrice ?? v.currentPoint.sellPrice ?? v.currentPoint.basePrice;
    return v.priceMin ?? null;
  }

  function addLine(product: Product, variant: ProductVariant) {
    const price = priceOf(variant);
    const name = displayName(product, variant);
    if (price == null) {
      setScanError(`Produk "${name}" belum punya harga jual di lokasi ini.`);
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === variant.id);
      if (existing) return prev.map((l) => (l.variantId === variant.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { variantId: variant.id, name, price, qty: 1 }];
    });
    setResults([]);
    setSearch("");
    setScanError("");
    searchInputRef.current?.focus();
  }

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  async function printReceipt(orderId: string) {
    setPrinting(true);
    try {
      await api.openFile(`/orders/${orderId}/receipt`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPrinting(false);
    }
  }

  async function checkout() {
    if (lines.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.post<Order>("/orders", {
        items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
        shippingMethod: "PICKUP",
        paymentMethod: payment,
        notes: "Transaksi POS Kasir",
        pointId: myPointId,
      });
      setLastOrder(order);
      setLines([]);
      searchInputRef.current?.focus();
      printReceipt(order.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Kasir — POS</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <Input
              ref={searchInputRef}
              placeholder="Cari produk / scan barcode..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
              autoFocus
            />
            {scanError && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                <ScanBarcode size={12} /> {scanError}
              </p>
            )}
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-black/10 bg-white shadow-soft">
                {results.map((r) => {
                  const price = priceOf(r.variant);
                  return (
                    <button
                      key={r.variant.id}
                      onClick={() => addLine(r.product, r.variant)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent"
                    >
                      <span>{displayName(r.product, r.variant)}</span>
                      <span className="text-primary">{price != null ? formatRupiah(price) : "-"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <table className="w-full text-sm">
              <thead className="text-left text-ink/50">
                <tr><th className="pb-2">Produk</th><th className="pb-2">Qty</th><th className="pb-2">Subtotal</th><th></th></tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.variantId} className="border-t border-black/5">
                    <td className="py-2">{l.name}</td>
                    <td className="py-2">{l.qty}</td>
                    <td className="py-2">{formatRupiah(l.price * l.qty)}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => setLines(lines.filter((x) => x.variantId !== l.variantId))} className="text-ink/40 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-ink/40">Belum ada item, cari produk di atas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit space-y-3">
          <p className="font-semibold">Pembayaran</p>
          <div className="flex gap-2">
            {(["COD", "TRANSFER", "EWALLET"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPayment(m)}
                className={`flex-1 rounded-xl border px-2 py-2 text-xs font-medium ${payment === m ? "border-primary bg-primary-light text-primary" : "border-black/10"}`}
              >
                {m === "COD" ? "Cash" : m === "TRANSFER" ? "Transfer" : "QRIS"}
              </button>
            ))}
          </div>
          <hr className="border-black/5" />
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatRupiah(total)}</span></div>
          <button onClick={checkout} disabled={submitting || lines.length === 0} className="btn-primary w-full disabled:opacity-40">
            {submitting ? "Memproses..." : "Bayar & Cetak Struk"}
          </button>

          {lastOrder && (
            <div className="mt-3 rounded-xl border border-dashed border-black/20 p-3 text-xs">
              <p className="mb-1 flex items-center gap-1 font-semibold"><Printer size={12} /> Struk {lastOrder.orderNumber}</p>
              <p>Total: {formatRupiah(lastOrder.total)}</p>
              <p>Pembayaran: {lastOrder.paymentMethod}</p>
              <button
                onClick={() => printReceipt(lastOrder.id)}
                disabled={printing}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-accent py-1.5 font-medium hover:bg-primary-light hover:text-primary disabled:opacity-50"
              >
                <Printer size={12} /> {printing ? "Membuka..." : "Cetak Ulang Struk"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KasirDashboardPage() {
  return (
    <RoleGuard allow={["KASIR", "ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="KASIR" />
        <KasirContent />
      </div>
    </RoleGuard>
  );
}
