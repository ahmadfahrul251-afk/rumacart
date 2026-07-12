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
import { FulfillmentPoint, Product } from "@/types";

interface ItemRow {
  productId: string;
  qty: number;
}

function NewStockTransferContent() {
  const router = useRouter();
  const [points, setPoints] = useState<FulfillmentPoint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [toPointId, setToPointId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ productId: "", qty: 1 }]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<FulfillmentPoint[]>("/points").then(setPoints).catch(() => setPoints([]));
    api
      .get<{ items: Product[] }>("/products?limit=100")
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, []);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((prev) => [...prev, { productId: "", qty: 1 }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!toPointId) {
      setError("Point tujuan wajib dipilih");
      return;
    }
    const validItems = items.filter((row) => row.productId && row.qty > 0);
    if (validItems.length === 0) {
      setError("Tambahkan minimal 1 produk");
      return;
    }
    setSaving(true);
    try {
      const transfer = await api.post<{ id: string }>("/stock-transfers", {
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
      <p className="mb-6 text-sm text-ink/60">Pusat berperan sebagai supplier internal — kirim stok ke 1 Point.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Point Tujuan *</label>
            <select
              value={toPointId}
              onChange={(e) => setToPointId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih point</option>
              {points.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
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
                  value={row.productId}
                  onChange={(e) => updateItem(i, { productId: e.target.value })}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Pilih produk</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
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
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <NewStockTransferContent />
      </div>
    </RoleGuard>
  );
}
