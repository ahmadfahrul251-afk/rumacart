"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Supplier, FulfillmentPoint, Product } from "@/types";
import { formatRupiah } from "@/lib/utils";

interface ItemRow {
  productId: string;
  qty: number;
  costPrice: number;
}

function NewPurchaseOrderContent() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdminPoint = user?.role === "ADMIN_POINT";
  const isNonRdhAdmin = isAdminPoint && user?.managedPoint && user.managedPoint.type !== "RDH";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [points, setPoints] = useState<FulfillmentPoint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [pointId, setPointId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ productId: "", qty: 1, costPrice: 0 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Sesuai arsitektur Hub and Spoke: supplier cuma boleh kirim barang ke RDH,
  // jadi dropdown Point tujuan cuma nampilin lokasi bertipe RDH.
  useEffect(() => {
    // GET /suppliers otomatis cuma balikin supplier pusat-wide + lokal Point-nya
    // sendiri kalau yang login Admin Point (dikunci di backend).
    api.get<Supplier[]>("/suppliers").then(setSuppliers).catch(() => setSuppliers([]));
    api.get<FulfillmentPoint[]>("/points?type=RDH").then(setPoints).catch(() => setPoints([]));
    api
      .get<{ items: Product[] }>("/products?limit=100")
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, []);

  // Admin Point: Point tujuan dikunci ke Point yang dia kelola, tidak perlu dipilih manual.
  useEffect(() => {
    if (isAdminPoint && user?.managedPointId) setPointId(user.managedPointId);
  }, [isAdminPoint, user?.managedPointId]);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((prev) => [...prev, { productId: "", qty: 1, costPrice: 0 }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    // Saran harga beli: pakai basePrice (harga dasar) RDH tujuan yang sudah
    // pernah diklaim/di-set sebelumnya — bukan lagi 1 harga global di Product.
    const suggestedCost = product?.inventory?.find((inv) => inv.pointId === pointId)?.basePrice ?? 0;
    updateItem(index, { productId, costPrice: suggestedCost });
  }

  const total = items.reduce((sum, row) => sum + row.qty * row.costPrice, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!supplierId || !pointId) {
      setError("Supplier dan Point tujuan wajib dipilih");
      return;
    }
    const validItems = items.filter((row) => row.productId && row.qty > 0);
    if (validItems.length === 0) {
      setError("Tambahkan minimal 1 produk");
      return;
    }
    setSaving(true);
    try {
      const po = await api.post<{ id: string }>("/purchase-orders", {
        supplierId,
        pointId,
        notes,
        items: validItems,
      });
      router.push(`/dashboard/admin/purchase-orders/${po.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (isNonRdhAdmin) {
    return (
      <div className="flex-1 p-6">
        <h1 className="mb-6 text-2xl font-bold">Buat Purchase Order</h1>
        <div className="card max-w-xl">
          <p className="text-sm text-ink/70">
            Lokasi <strong>{user?.managedPoint?.name}</strong> bertipe {user?.managedPoint?.type === "MART" ? "Mart" : "Point"},
            bukan RDH. Sesuai alur distribusi RumaCart, Purchase Order ke supplier cuma bisa dibuat oleh RDH.
          </p>
          <p className="mt-2 text-sm text-ink/70">
            Untuk menambah stok di lokasi kamu, ajukan lewat menu <strong>Transfer Stok</strong> dari RDH yang mensuplai lokasi ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Buat Purchase Order</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Supplier *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Point Tujuan *</label>
            {isAdminPoint ? (
              <p className="rounded-xl border border-black/10 bg-accent/50 px-4 py-2.5 text-sm">
                {user?.managedPoint?.name || "Point kamu"}
              </p>
            ) : (
              <select
                value={pointId}
                onChange={(e) => setPointId(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Pilih point</option>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Catatan</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Item Barang</h2>
          {items.map((row, i) => {
            const product = products.find((p) => p.id === row.productId);
            return (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-5">
                  <label className="mb-1 block text-xs text-ink/50">Produk</label>
                  <select
                    value={row.productId}
                    onChange={(e) => handleProductChange(i, e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Pilih produk</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-ink/50">Qty</label>
                  <Input
                    type="number"
                    min={1}
                    value={row.qty}
                    onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-3">
                  <label className="mb-1 block text-xs text-ink/50">Harga Beli/pcs</label>
                  <Input
                    type="number"
                    min={0}
                    value={row.costPrice}
                    onChange={(e) => updateItem(i, { costPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-1 pb-2.5 text-right text-xs text-ink/50">
                  {product ? formatRupiah(row.qty * row.costPrice) : ""}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label="Hapus item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
          >
            <Plus size={14} /> Tambah Item
          </button>

          <div className="border-t border-black/5 pt-3 text-right">
            <span className="text-sm text-ink/60">Total: </span>
            <span className="text-lg font-bold text-primary">{formatRupiah(total)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={saving} className="!py-2.5 !px-6 text-sm">
          {saving ? "Menyimpan..." : "Buat Purchase Order"}
        </Button>
      </form>
    </div>
  );
}

export default function NewPurchaseOrderPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <NewPurchaseOrderContent />
      </div>
    </RoleGuard>
  );
}
