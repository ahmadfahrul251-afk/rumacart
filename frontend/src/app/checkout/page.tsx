"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { api } from "@/lib/api";
import { Address, Order, Voucher, DeliveryQuote } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { Tag, X, MapPin } from "lucide-react";

const PAYMENT_OPTIONS = [
  { value: "COD", label: "Bayar di Tempat (COD)" },
  { value: "TRANSFER", label: "Transfer Bank" },
  { value: "EWALLET", label: "E-Wallet (Dummy)" },
];

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items, subtotal, removeByPoint } = useCart();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ recipientName: "", phone: "", fullAddress: "", kecamatan: "", city: "" });

  // Ongkir sekarang PICKUP (gratis) atau DELIVERY (biaya beda-beda tergantung
  // kecamatan tujuan x Point asal) — dipilih PER GRUP Point, bukan global lagi,
  // karena jangkauan & biaya kurir tiap Point bisa berbeda.
  const [shippingMethods, setShippingMethods] = useState<Record<string, "PICKUP" | "DELIVERY">>({});
  const [quotes, setQuotes] = useState<Record<string, DeliveryQuote>>({});

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login?redirect=/checkout");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.get<Address[]>("/addresses").then((res) => {
      setAddresses(res);
      const def = res.find((a) => a.isDefault) || res[0];
      if (def) setAddressId(def.id);
      else setShowNewAddress(true);
    });
  }, [user]);

  // Point sudah dipilih per item di halaman produk (lihat PointPickerModal),
  // jadi di checkout tinggal dikelompokkan per Point — tiap grup jadi 1 Order
  // terpisah. Kalau keranjang cuma dari 1 Point, ya cuma jadi 1 Order seperti biasa.
  const groups = items.reduce<Record<string, { pointId: string; pointName: string; pointCode: string; items: typeof items; subtotal: number }>>(
    (acc, item) => {
      if (!acc[item.pointId]) acc[item.pointId] = { pointId: item.pointId, pointName: item.pointName, pointCode: item.pointCode, items: [], subtotal: 0 };
      acc[item.pointId].items.push(item);
      acc[item.pointId].subtotal += item.price * item.qty;
      return acc;
    },
    {}
  );
  const groupList = Object.values(groups);
  const isMultiOrder = groupList.length > 1;
  const pointIdsKey = groupList.map((g) => g.pointId).join(",");

  const selectedAddress = !showNewAddress ? addresses.find((a) => a.id === addressId) : null;
  const effectiveKecamatan = (showNewAddress ? newAddress.kecamatan : selectedAddress?.kecamatan) || "";
  const effectiveCity = (showNewAddress ? newAddress.city : selectedAddress?.city) || "";

  // Cek ongkir DELIVERY tiap grup Point sekali panggil, dicocokkan ke kecamatan
  // alamat yang lagi dipilih/diisi. Kalau Point-nya tidak melayani kecamatan
  // itu, otomatis dikunci ke PICKUP.
  useEffect(() => {
    if (!pointIdsKey) return;
    api
      .post<Record<string, DeliveryQuote>>("/delivery-areas/quote", {
        pointIds: pointIdsKey.split(","),
        kecamatan: effectiveKecamatan || undefined,
        city: effectiveCity || undefined,
      })
      .then((res) => {
        setQuotes(res);
        setShippingMethods((prev) => {
          const next = { ...prev };
          for (const pid of pointIdsKey.split(",")) {
            const avail = res[pid]?.available;
            if (!next[pid] || (next[pid] === "DELIVERY" && !avail)) {
              next[pid] = avail ? "DELIVERY" : "PICKUP";
            }
          }
          return next;
        });
      })
      .catch(() => setQuotes({}));
  }, [pointIdsKey, effectiveKecamatan, effectiveCity]);

  const totalShippingCost = groupList.reduce(
    (sum, g) => sum + (shippingMethods[g.pointId] === "DELIVERY" ? quotes[g.pointId]?.cost ?? 0 : 0),
    0
  );
  const discount = appliedVoucher?.discount ?? 0;
  const total = Math.max(subtotal + totalShippingCost - discount, 0);

  async function applyVoucher() {
    if (!voucherCode.trim()) return;
    setVoucherChecking(true);
    setVoucherError("");
    try {
      const result = await api.post<Voucher>("/vouchers/validate", { code: voucherCode.trim().toUpperCase(), subtotal });
      setAppliedVoucher(result);
    } catch (err: any) {
      setAppliedVoucher(null);
      setVoucherError(err.message);
    } finally {
      setVoucherChecking(false);
    }
  }

  function removeVoucher() {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  }

  async function handleCheckout() {
    setError("");
    if (groupList.length === 0) return;
    setSubmitting(true);
    try {
      let finalAddressId = addressId;
      if (showNewAddress) {
        const created = await api.post<Address>("/addresses", { ...newAddress, isDefault: true });
        finalAddressId = created.id;
      }

      // Dibuat berurutan (bukan sekaligus/paralel) supaya kalau ada yang gagal
      // di tengah jalan, grup yang sudah berhasil jadi Order tetap aman dan
      // langsung dikeluarkan dari keranjang (tidak numpuk/kepencet 2x).
      const createdOrders: Order[] = [];
      for (let i = 0; i < groupList.length; i++) {
        const g = groupList[i];
        try {
          const order = await api.post<Order>("/orders", {
            addressId: finalAddressId,
            items: g.items.map((it) => ({ productId: it.productId, qty: it.qty })),
            shippingMethod: shippingMethods[g.pointId] || "PICKUP",
            paymentMethod,
            // Voucher cuma dipakai sekali, di Order pertama saja — supaya tidak
            // dobel potongan/dobel pakai kuota kalau pesanan dipecah jadi beberapa.
            voucherCode: i === 0 && appliedVoucher ? appliedVoucher.code : undefined,
            notes,
            pointId: g.pointId,
          });
          createdOrders.push(order);
          removeByPoint(g.pointId);
        } catch (err: any) {
          setError(
            `Pesanan dari ${g.pointName} gagal dibuat: ${err.message}.` +
              (createdOrders.length > 0
                ? ` ${createdOrders.length} pesanan lain sudah berhasil dibuat duluan dan tetap diproses.`
                : "")
          );
          setSubmitting(false);
          if (createdOrders.length > 0) router.push(`/orders?highlight=${createdOrders[0].id}`);
          return;
        }
      }

      if (paymentMethod === "COD" || createdOrders.length > 1) {
        router.push(`/orders?highlight=${createdOrders[0].id}`);
      } else {
        router.push(`/orders/${createdOrders[0].id}/payment`);
      }
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="mb-4 text-ink/60">Keranjang "Beli Sekarang"-mu kosong, tidak ada yang bisa di-checkout.</p>
          <Link href="/products" className="btn-primary !inline-flex !py-2.5 !px-5 text-sm">Mulai Belanja</Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

        <div className="grid items-start gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <section className="card">
              <p className="mb-3 font-semibold">Alamat Pengiriman</p>
              {addresses.length > 0 && !showNewAddress ? (
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-black/10 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-light">
                      <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1" />
                      <div className="text-sm">
                        <p className="font-medium">{a.label} — {a.recipientName}</p>
                        <p className="text-ink/60">
                          {a.fullAddress}{a.kecamatan ? `, Kec. ${a.kecamatan}` : ""}, {a.city}
                        </p>
                        {!a.kecamatan && (
                          <p className="text-xs text-amber-600">Kecamatan belum diisi — opsi Diantar mungkin tidak muncul.</p>
                        )}
                      </div>
                    </label>
                  ))}
                  <button onClick={() => setShowNewAddress(true)} className="text-sm font-medium text-primary">
                    + Gunakan alamat baru
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input placeholder="Nama Penerima" value={newAddress.recipientName} onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })} />
                  <Input placeholder="No. HP" value={newAddress.phone} onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })} />
                  <Input placeholder="Alamat Lengkap" value={newAddress.fullAddress} onChange={(e) => setNewAddress({ ...newAddress, fullAddress: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Kecamatan" value={newAddress.kecamatan} onChange={(e) => setNewAddress({ ...newAddress, kecamatan: e.target.value })} />
                    <Input placeholder="Kota" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
                  </div>
                  <p className="text-xs text-ink/40">Isi Kecamatan supaya sistem bisa cek Point mana yang bisa antar ke alamatmu.</p>
                  {addresses.length > 0 && (
                    <button onClick={() => setShowNewAddress(false)} className="text-sm text-ink/60">Batal, pilih alamat tersimpan</button>
                  )}
                </div>
              )}
            </section>

            <section className="card">
              <p className="mb-3 font-semibold">Pesanan {isMultiOrder ? `(${groupList.length} Point → ${groupList.length} pesanan terpisah)` : ""}</p>
              {isMultiOrder && (
                <p className="mb-3 text-xs text-amber-700">
                  Produk di keranjangmu berasal dari {groupList.length} Point berbeda, jadi otomatis dipecah jadi {groupList.length} pesanan —
                  tetap 1x klik "Buat Pesanan" di bawah.
                </p>
              )}
              <div className="space-y-4">
                {groupList.map((g) => {
                  const quote = quotes[g.pointId];
                  const method = shippingMethods[g.pointId] || "PICKUP";
                  return (
                    <div key={g.pointId} className="rounded-xl border border-black/10 p-3">
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                        <MapPin size={14} className="text-primary" /> {g.pointName} <span className="font-normal text-ink/40">({g.pointCode})</span>
                      </p>
                      {g.items.map((it) => (
                        <div key={it.productId} className="flex justify-between text-sm text-ink/70">
                          <span>{it.name} x{it.qty}</span>
                          <span>{formatRupiah(it.price * it.qty)}</span>
                        </div>
                      ))}
                      <div className="mt-1.5 flex justify-between border-t border-black/5 pt-1.5 text-xs text-ink/50">
                        <span>Subtotal Point ini</span>
                        <span>{formatRupiah(g.subtotal)}</span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className={`cursor-pointer rounded-xl border p-2.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary-light ${method === "PICKUP" ? "border-primary" : "border-black/10"}`}>
                          <input type="radio" name={`ship-${g.pointId}`} className="hidden" checked={method === "PICKUP"} onChange={() => setShippingMethods((s) => ({ ...s, [g.pointId]: "PICKUP" }))} />
                          <p className="font-medium">Pickup di Point</p>
                          <p className="text-ink/50">Gratis, ambil sendiri</p>
                        </label>
                        <label
                          className={`rounded-xl border p-2.5 text-xs ${
                            quote?.available
                              ? `cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary-light ${method === "DELIVERY" ? "border-primary" : "border-black/10"}`
                              : "cursor-not-allowed border-black/5 opacity-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`ship-${g.pointId}`}
                            className="hidden"
                            disabled={!quote?.available}
                            checked={method === "DELIVERY"}
                            onChange={() => setShippingMethods((s) => ({ ...s, [g.pointId]: "DELIVERY" }))}
                          />
                          <p className="font-medium">Diantar Kurir</p>
                          <p className="text-ink/50">
                            {quote?.available ? formatRupiah(quote.cost) : "Tidak melayani kecamatan ini"}
                          </p>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="card">
              <p className="mb-3 font-semibold">Metode Pembayaran</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className={`cursor-pointer rounded-xl border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-light ${paymentMethod === opt.value ? "border-primary" : "border-black/10"}`}>
                    <input type="radio" name="payment" className="hidden" checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} />
                    <p className="font-medium">{opt.label}</p>
                  </label>
                ))}
              </div>
              {isMultiOrder && paymentMethod !== "COD" && (
                <p className="mt-2 text-xs text-ink/50">
                  Karena jadi {groupList.length} pesanan terpisah, pembayaran juga perlu dikonfirmasi satu-satu di halaman Pesanan Saya.
                </p>
              )}
            </section>

            <section className="card space-y-3">
              <p className="font-semibold">Voucher & Catatan</p>

              {appliedVoucher ? (
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-light px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag size={15} className="text-primary" />
                    <span className="font-mono font-semibold">{appliedVoucher.code}</span>
                    <span className="text-ink/60">— potongan {formatRupiah(appliedVoucher.discount ?? 0)}</span>
                  </div>
                  <button type="button" onClick={removeVoucher} className="rounded-lg p-1 hover:bg-white" aria-label="Hapus voucher">
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Kode voucher (opsional)"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value);
                      setVoucherError("");
                    }}
                  />
                  <button
                    type="button"
                    onClick={applyVoucher}
                    disabled={voucherChecking || !voucherCode.trim()}
                    className="shrink-0 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
                  >
                    {voucherChecking ? "Cek..." : "Terapkan"}
                  </button>
                </div>
              )}
              {voucherError && <p className="text-sm text-red-600">{voucherError}</p>}
              {isMultiOrder && appliedVoucher && (
                <p className="text-xs text-ink/50">Voucher cuma dipakai di pesanan pertama ({groupList[0].pointName}), tidak dobel di tiap pesanan.</p>
              )}

              <textarea
                placeholder="Catatan untuk kurir (opsional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-primary"
                rows={3}
              />
            </section>
          </div>

          <div className="card sticky top-20 h-fit space-y-3">
            <p className="font-semibold">Ringkasan Pesanan</p>
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
            <div className="flex justify-between text-sm">
              <span>Ongkir</span>
              <span>{totalShippingCost === 0 ? "Gratis" : formatRupiah(totalShippingCost)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-primary"><span>Diskon Voucher</span><span>-{formatRupiah(discount)}</span></div>
            )}
            <hr className="border-black/5" />
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatRupiah(total)}</span></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={handleCheckout} disabled={submitting} className="w-full">
              {submitting ? "Memproses..." : "Buat Pesanan"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
