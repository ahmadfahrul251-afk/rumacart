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
import { FulfillmentPoint, Product, ProductVariant } from "@/types";

interface ItemRow {
  variantId: string;
  qty: number;
}

interface VariantOption { product: Product; variant: ProductVariant; }

function variantLabel(o: VariantOption) {
  const name = !o.variant.name || o.variant.name === "Default" ? o.product.name : `${o.product.name} (${o.variant.name})`;
  return `${name} — ${o.variant.sku}`;
}

function NewStockTransferContent() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdminLokasi = user?.role === "ADMIN_POINT";
  const [points, setPoints] = useState<FulfillmentPoint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [fromPointId, setFromPointId] = useState("");
  const [toPointId, setToPointId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ variantId: "", qty: 1 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const variantOptions: VariantOption[] = products.flatMap((p) => (p.variants || []).map((v) => ({ product: p, variant: v })));

  useEffect(() => {
    api.get<FulfillmentPoint[]>("/points").then(setPoints).catch(() => setPoints([]));
    api
      .get<{ items: Product[] }>("/products?limit=100")
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (isAdminLokasi && user?.managedPointId) setFromPointId(user.managedPointId);
  }, [isAdminLokasi, user?.managedPointId]);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((prev) => [...prev, { variantId: "", qty: 1 }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!toPointId) {
      setError("Lokasi tujuan wajib dipilih");
      return;
    }
    if (fromPointId && fromPointId === toPointId) {
      setError("Lokasi asal dan tujuan tidak boleh sama");
      return;
    }
    const validItems = items.filter((row) => row.variantId && row.qty > 0);
    if (validItems.length === 0) {
      setError("Tambahkan minimal 1 produk");
      return;
    }
    setSaving(true);
    try {
      const transfer = await api.post<{ id: string }>("/stock-transfers", {
        fromPointId: fromPointId || undefined,
        toPointId,
        notes,
        items: validItems,
      });
      router.push(`/dashboard/admin/stock-transfers/${transfer.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-1 text-2xl font-bold">Kirim Transfer Stok</h1>
      <p className="mb-6 text-sm text-ink/60">Pindahkan stok antar lokasi — RDH ke Mart/Point, Mart ke Point, dst.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Lokasi Asal {isAdminLokasi ? "" : "(opsional)"}</label>
            {isAdminLokasi ? (
              <p className="rounded-xl border border-black/10 bg-accent/50 px-4 py-2.5 text-sm">
                {user?.managedPoint?.name || "Lokasi kamu"}
              </p>
            ) : (
              <>
                <select
                  value={fromPointId}
                  onChange={(e) => setFromPointId(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Dari Pusat (mode lama, stok sumber tidak dipotong)</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink/40">Kosongkan cuma kalau memang belum ada lokasi sumber yang jelas.</p>
              </>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Lokasi Tujuan *</label>
            <select
              value={toPointId}
              onChange={(e) => setToPointId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih lokasi tujuan</option>
              {points.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Catatan</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Item Barang</h2>
          {items.map((row, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-8">
                <label className="mb-1 block text-xs text-ink/50">Produk</label>
                <select
                  value={row.variantId}
                  onChange={(e) => updateItem(i, { variantId: e.target.value })}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Pilih produk</option>
                  {variantOptions.map((o) => (
                    <option key={o.variant.id} value={o.variant.id}>{variantLabel(o)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="mb-1 block text-xs text-ink/50">Qty</label>
                <Input
                  type="number"
                  min={1}
                  value={row.qty}
                  onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                />
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
          ))}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
          >
            <Plus size={14} /> Tambah Item
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={saving} className="!py-2.5 !px-6 text-sm">
          {saving ? "Mengirim..." : "Kirim Transfer"}
        </Button>
      </form>
    </div>
  );
}

export default function NewStockTransferPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <NewStockTransferContent />
      </div>
    </RoleGuard>
  );
}
