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
import { Address, Order, Voucher, EligiblePoint } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { Tag, X, MapPin } from "lucide-react";

const SHIPPING_OPTIONS = [
  { value: "PICKUP", label: "Pickup di Point", cost: 0 },
  { value: "SAME_DAY", label: "Same Day", cost: 9000 },
  { value: "INSTANT", label: "Instant", cost: 15000 },
];
const PAYMENT_OPTIONS = [
  { value: "COD", label: "Bayar di Tempat (COD)" },
  { value: "TRANSFER", label: "Transfer Bank" },
  { value: "EWALLET", label: "E-Wallet (Dummy)" },
];

export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ recipientName: "", phone: "", fullAddress: "", city: "" });

  const [shippingMethod, setShippingMethod] = useState("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [eligiblePoints, setEligiblePoints] = useState<EligiblePoint[] | null>(null);
  const [pointId, setPointId] = useState("");
  const [pointsError, setPointsError] = useState("");
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

  // Cari daftar Point yang stoknya cukup untuk keranjang ini, diurutkan dari
  // yang terdekat dengan alamat terpilih. Customer bisa ganti manual di bawah;
  // Point paling atas (tersedia) otomatis jadi pilihan awal.
  const itemsKey = items.map((i) => `${i.productId}:${i.qty}`).join(",");
  useEffect(() => {
    if (items.length === 0) return;
    setEligiblePoints(null);
    setPointsError("");
    api
      .post<EligiblePoint[]>("/points/eligible", {
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        addressId: !showNewAddress && addressId ? addressId : undefined,
      })
      .then((res) => {
        setEligiblePoints(res);
        setPointId((prev) => (res.some((p) => p.pointId === prev) ? prev : res[0]?.pointId || ""));
      })
      .catch((err: any) => {
        setEligiblePoints([]);
        setPointsError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, addressId, showNewAddress]);

  const shippingCost = SHIPPING_OPTIONS.find((s) => s.value === shippingMethod)?.cost ?? 0;
  const discount = appliedVoucher?.discount ?? 0;
  const total = Math.max(subtotal + shippingCost - discount, 0);

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
    if (!pointId) {
      setError("Pilih Point tempat belanja dulu");
      return;
    }
    setSubmitting(true);
    try {
      let finalAddressId = addressId;
      if (showNewAddress) {
        const created = await api.post<Address>("/addresses", { ...newAddress, isDefault: true });
        finalAddressId = created.id;
      }

      const order = await api.post<Order>("/orders", {
        addressId: finalAddressId,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        shippingMethod,
        paymentMethod,
        voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
        notes,
        pointId,
      });

      clearCart();
      router.push(paymentMethod === "COD" ? `/orders?highlight=${order.id}` : `/orders/${order.id}/payment`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="mb-4 text-ink/60">Keranjangmu kosong, tidak ada yang bisa di-checkout.</p>
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
                        <p className="text-ink/60">{a.fullAddress}, {a.city}</p>
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
                  <Input placeholder="Kota" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
                  {addresses.length > 0 && (
                    <button onClick={() => setShowNewAddress(false)} className="text-sm text-ink/60">Batal, pilih alamat tersimpan</button>
                  )}
                </div>
              )}
            </section>

            <section className="card">
              <p className="mb-3 font-semibold">Pilih Point Belanja</p>
              <p className="mb-3 text-xs text-ink/50">
                Pesananmu akan dipenuhi dari Point yang kamu pilih. Cuma Point yang stoknya cukup untuk semua item di
                keranjang yang muncul di sini, diurutkan dari yang terdekat dengan alamatmu.
              </p>
              {eligiblePoints === null && <p className="text-sm text-ink/50">Mencari Point yang tersedia...</p>}
              {eligiblePoints?.length === 0 && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {pointsError || "Tidak ada Point dengan stok mencukupi untuk pesanan ini. Coba kurangi jumlah item di keranjang."}
                </p>
              )}
              {eligiblePoints && eligiblePoints.length > 0 && (
                <div className="space-y-2">
                  {eligiblePoints.map((p) => (
                    <label
                      key={p.pointId}
                      className="flex cursor-pointer items-start gap-2 rounded-xl border border-black/10 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-light"
                    >
                      <input type="radio" name="point" checked={pointId === p.pointId} onChange={() => setPointId(p.pointId)} className="mt-1" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{p.name}</p>
                        <p className="flex items-center gap-1 text-ink/60">
                          <MapPin size={12} /> {p.city}
                          {p.distance != null && <span> · {p.distance.toFixed(1)} km</span>}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <p className="mb-3 font-semibold">Metode Pengiriman</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {SHIPPING_OPTIONS.map((opt) => (
                  <label key={opt.value} className={`cursor-pointer rounded-xl border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-light ${shippingMethod === opt.value ? "border-primary" : "border-black/10"}`}>
                    <input type="radio" name="shipping" className="hidden" checked={shippingMethod === opt.value} onChange={() => setShippingMethod(opt.value)} />
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-ink/50">{opt.cost === 0 ? "Gratis" : formatRupiah(opt.cost)}</p>
                  </label>
                ))}
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
            {items.map((i) => (
              <div key={i.productId} className="flex justify-between text-sm">
                <span className="text-ink/60">{i.name} x{i.qty}</span>
                <span>{formatRupiah(i.price * i.qty)}</span>
              </div>
            ))}
            <hr className="border-black/5" />
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span>Ongkir</span><span>{formatRupiah(shippingCost)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-primary"><span>Diskon Voucher</span><span>-{formatRupiah(discount)}</span></div>
            )}
            <hr className="border-black/5" />
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatRupiah(total)}</span></div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={handleCheckout} disabled={submitting || !pointId} className="w-full">
              {submitting ? "Memproses..." : "Buat Pesanan"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
