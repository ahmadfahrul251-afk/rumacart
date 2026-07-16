"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Bell, Plus, Minus, Trash2, Search, ShoppingBag, Loader2, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { api } from "@/lib/api";
import { formatRupiah } from "@/lib/utils";
import { ShoppingPlan, Product, Address, EligiblePoint } from "@/types";

const REMINDER_OPTIONS = [
  { value: 1, label: "H-1" },
  { value: 3, label: "H-3" },
  { value: 7, label: "H-7" },
  { value: 0, label: "Tanpa pengingat" },
];

export default function BelanjaBulananPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <BelanjaBulananContent />
      <Footer />
    </>
  );
}

function BelanjaBulananContent() {
  const buyNow = useCart();
  const router = useRouter();
  const [plan, setPlan] = useState<ShoppingPlan | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [error, setError] = useState("");

  // Tambah item
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickingProduct, setPickingProduct] = useState<Product | null>(null); // dipakai kalau produk punya >1 varian
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);

  // Pindah ke keranjang
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState("");

  function load() {
    setLoadFailed(false);
    api
      .get<ShoppingPlan>("/shopping-plans/me")
      .then(setPlan)
      .catch(() => setLoadFailed(true));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cari produk buat ditambahkan — debounce sederhana biar tidak nembak API tiap ketikan.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .get<{ items: Product[] }>(`/products?search=${encodeURIComponent(query)}&limit=6`)
        .then((res) => setResults(res.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  async function handleScheduleChange(patch: { checkoutDay?: number; reminderOffsetDays?: number }) {
    if (!plan) return;
    setSavingSchedule(true);
    setError("");
    try {
      const updated = await api.patch<ShoppingPlan>(`/shopping-plans/${plan.id}`, patch);
      setPlan(updated);
      setScheduleSaved(true);
      setTimeout(() => setScheduleSaved(false), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSchedule(false);
    }
  }

  async function addVariant(variantId: string) {
    if (!plan) return;
    setAddingVariantId(variantId);
    setError("");
    try {
      const updated = await api.post<ShoppingPlan>(`/shopping-plans/${plan.id}/items`, { variantId });
      setPlan(updated);
      setQuery("");
      setResults([]);
      setPickingProduct(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingVariantId(null);
    }
  }

  function handlePickProduct(product: Product) {
    const variants = product.variants || [];
    if (variants.length <= 1) {
      if (variants[0]) addVariant(variants[0].id);
      return;
    }
    setPickingProduct(product);
  }

  async function updateQty(itemId: string, qty: number) {
    if (!plan || qty < 1) return;
    const prevItems = plan.items;
    setPlan({ ...plan, items: plan.items.map((i) => (i.id === itemId ? { ...i, qty } : i)) }); // optimistic
    try {
      const updated = await api.patch<ShoppingPlan>(`/shopping-plans/${plan.id}/items/${itemId}`, { qty });
      setPlan(updated);
    } catch (err: any) {
      setError(err.message);
      setPlan((p) => (p ? { ...p, items: prevItems } : p));
    }
  }

  async function removeItemFromPlan(itemId: string) {
    if (!plan) return;
    try {
      const updated = await api.delete<ShoppingPlan>(`/shopping-plans/${plan.id}/items/${itemId}`);
      setPlan(updated);
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Pindahkan tiap item rencana ke Keranjang Beli Sekarang — per item dicarikan
  // Point terbaik lewat endpoint Smart Order Routing yang sudah ada
  // (/points/eligible), sama seperti alur "Beli Sekarang" biasa.
  async function handleMoveToCart() {
    if (!plan || plan.items.length === 0) return;
    setMoving(true);
    setMoveError("");
    try {
      let addressId: string | undefined;
      try {
        const addresses = await api.get<Address[]>("/addresses");
        addressId = (addresses.find((a) => a.isDefault) || addresses[0])?.id;
      } catch {
        // lanjut tanpa addressId — Point tetap dicari, cuma tidak diurutkan jarak
      }

      const failed: string[] = [];
      for (const item of plan.items) {
        try {
          const points = await api.post<EligiblePoint[]>("/points/eligible", {
            items: [{ variantId: item.variantId, qty: item.qty }],
            addressId,
          });
          const best = points[0];
          if (!best || best.price == null) {
            failed.push(item.productName);
            continue;
          }
          buyNow.addItem({
            variantId: item.variantId,
            name:
              item.variantName && item.variantName !== "Default"
                ? `${item.productName} (${item.variantName})`
                : item.productName,
            price: best.price,
            image: item.image || undefined,
            qty: item.qty,
            pointId: best.pointId,
            pointName: best.name,
            pointCode: best.code,
          });
        } catch {
          failed.push(item.productName);
        }
      }

      if (failed.length > 0) {
        setMoveError(`${failed.length} barang tidak bisa dipindahkan (stok kosong di semua lokasi): ${failed.join(", ")}`);
      }
      router.push("/cart");
    } finally {
      setMoving(false);
    }
  }

  if (loadFailed) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <EmptyState
          icon="😔"
          title="Gagal memuat Belanja Bulanan"
          description="Sepertinya ada gangguan koneksi. Coba lagi ya."
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={load} variant="outline">
            <RefreshCw size={16} /> Coba Lagi
          </Button>
        </div>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Skeleton className="mb-4 h-32" />
        <Skeleton className="h-64" />
      </main>
    );
  }

  const estimatedTotal = plan.items.reduce((sum, i) => sum + (i.priceMin ?? 0) * i.qty, 0);
  const hasUnpriced = plan.items.some((i) => i.priceMin == null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <span className="text-2xl">🗓️</span>
        <div>
          <h1 className="text-2xl font-bold">Belanja Bulanan</h1>
          <p className="text-sm text-ink/60">Susun daftar kebutuhan bulanan, biar tidak ada yang kelupaan.</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {/* Kartu jadwal */}
      <div className="card mb-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-primary" />
          <p className="font-semibold">Jadwal Checkout</p>
          {scheduleSaved && <span className="text-xs font-medium text-primary">Tersimpan ✓</span>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-ink/70">Setiap tanggal berapa mau checkout?</label>
          <select
            value={plan.checkoutDay}
            disabled={savingSchedule}
            onChange={(e) => handleScheduleChange({ checkoutDay: Number(e.target.value) })}
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {Array.from({ length: 28 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Tanggal {i + 1}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm text-ink/70">
            <Bell size={14} /> Ingatkan berapa hari sebelumnya?
          </label>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={savingSchedule}
                onClick={() => handleScheduleChange({ reminderOffsetDays: opt.value })}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                  plan.reminderOffsetDays === opt.value ? "bg-primary text-white" : "bg-accent text-ink/70 hover:bg-primary-light"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tambah item */}
      <div className="card mb-5">
        <p className="mb-3 font-semibold">Tambah Barang</p>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari beras, minyak goreng, sabun..." className="pl-9" />
        </div>
        {query.trim() && (
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {searching && <p className="py-3 text-center text-sm text-ink/40">Mencari...</p>}
            {!searching && results.length === 0 && <p className="py-3 text-center text-sm text-ink/40">Produk tidak ditemukan</p>}
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePickProduct(p)}
                disabled={addingVariantId != null}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent disabled:opacity-50"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent text-lg">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    "🛒"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  {p.priceMin != null && (
                    <p className="text-xs text-ink/50">
                      {p.priceMin === p.priceMax ? formatRupiah(p.priceMin) : `${formatRupiah(p.priceMin)} – ${formatRupiah(p.priceMax!)}`}
                    </p>
                  )}
                </div>
                <Plus size={16} className="shrink-0 text-primary" />
              </button>
            ))}
          </div>
        )}

        {pickingProduct && (
          <div className="mt-3 rounded-xl border border-black/10 p-3">
            <p className="mb-2 text-sm font-medium">Pilih varian {pickingProduct.name}:</p>
            <div className="flex flex-wrap gap-2">
              {(pickingProduct.variants || []).map((v) => (
                <button
                  key={v.id}
                  disabled={addingVariantId != null}
                  onClick={() => addVariant(v.id)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-ink/70 hover:bg-primary-light disabled:opacity-50"
                >
                  {addingVariantId === v.id ? "Menambah..." : v.name}
                </button>
              ))}
              <button onClick={() => setPickingProduct(null)} className="rounded-lg px-3 py-1.5 text-sm text-ink/50 hover:bg-accent">
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Daftar item */}
      <div className="card mb-5">
        <p className="mb-3 font-semibold">Daftar Belanja ({plan.items.length})</p>

        {plan.items.length === 0 && (
          <EmptyState icon="🧺" title="Daftar masih kosong" description="Cari & tambahkan barang yang biasa kamu beli tiap bulan." />
        )}

        <div className="space-y-2">
          {plan.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-black/5 p-2.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent text-lg">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                ) : (
                  "🛒"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.variantName && item.variantName !== "Default" ? `${item.productName} (${item.variantName})` : item.productName}
                </p>
                <p className="text-xs text-ink/50">
                  {item.priceMin != null
                    ? item.priceMin === item.priceMax
                      ? formatRupiah(item.priceMin)
                      : `${formatRupiah(item.priceMin)} – ${formatRupiah(item.priceMax!)}`
                    : "Estimasi harga belum tersedia"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => updateQty(item.id, item.qty - 1)}
                  disabled={item.qty <= 1}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-accent hover:bg-primary-light disabled:opacity-40"
                >
                  <Minus size={13} />
                </button>
                <span className="w-5 text-center text-sm font-medium">{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-accent hover:bg-primary-light">
                  <Plus size={13} />
                </button>
              </div>
              <button onClick={() => removeItemFromPlan(item.id)} className="rounded-lg p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pindahkan ke keranjang */}
      {plan.items.length > 0 && (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink/60">Estimasi Total</p>
            <p className="text-lg font-bold text-primary">
              {formatRupiah(estimatedTotal)}
              {hasUnpriced && <span className="ml-1 text-xs font-normal text-ink/40">+lainnya</span>}
            </p>
          </div>
          {moveError && <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">{moveError}</p>}
          <Button onClick={handleMoveToCart} disabled={moving} className="w-full">
            {moving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Memindahkan...
              </>
            ) : (
              <>
                <ShoppingBag size={16} /> Pindahkan ke Keranjang Sekarang
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-xs text-ink/40">Kamu masih bisa ubah jumlah atau hapus barang sebelum bayar di halaman Keranjang.</p>
        </div>
      )}
    </main>
  );
}
