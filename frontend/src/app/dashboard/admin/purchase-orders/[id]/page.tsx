"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PackageCheck, XCircle } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PurchaseOrder } from "@/types";
import { formatRupiah } from "@/lib/utils";

function PurchaseOrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api
      .get<PurchaseOrder>(`/purchase-orders/${id}`)
      .then(setPo)
      .catch(() => setPo(null));
  }

  useEffect(load, [id]);

  async function handleReceive() {
    if (!confirm("Konfirmasi barang sudah diterima? Stok akan bertambah dan pengeluaran akan tercatat otomatis.")) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(`/purchase-orders/${id}/receive`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Batalkan Purchase Order ini?")) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(`/purchase-orders/${id}/cancel`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!po) {
    return (
      <div className="flex-1 p-6">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{po.poNumber}</h1>
          <p className="text-sm text-ink/60">
            {po.supplier?.name} · Tujuan: {po.point?.name}
          </p>
        </div>
        <Badge tone={po.status}>{po.status}</Badge>
      </div>

      <div className="card mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink/50">
            <tr>
              <th className="pb-2">Produk</th>
              <th className="pb-2">Qty</th>
              <th className="pb-2">Harga Beli</th>
              <th className="pb-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => (
              <tr key={item.id} className="border-t border-black/5">
                <td className="py-2">
                  {item.variant?.product?.name || item.variantId}
                  {item.variant?.name && item.variant.name !== "Default" && (
                    <span className="text-ink/40"> ({item.variant.name})</span>
                  )}
                </td>
                <td className="py-2">{item.qty}</td>
                <td className="py-2">{formatRupiah(item.costPrice)}</td>
                <td className="py-2 text-right">{formatRupiah(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 border-t border-black/5 pt-3 text-right">
          <span className="text-sm text-ink/60">Total: </span>
          <span className="text-lg font-bold text-primary">{formatRupiah(po.totalAmount)}</span>
        </div>
      </div>

      {po.notes && (
        <div className="card mb-4">
          <p className="text-xs text-ink/50">Catatan</p>
          <p className="text-sm">{po.notes}</p>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {po.status === "ORDERED" && (
        <div className="flex gap-3">
          <button
            onClick={handleReceive}
            disabled={busy}
            className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-50"
          >
            <PackageCheck size={16} /> Terima Barang
          </button>
          <button
            onClick={handleCancel}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle size={16} /> Batalkan
          </button>
        </div>
      )}

      {po.status === "RECEIVED" && (
        <p className="text-sm text-green-700">
          Barang sudah diterima{po.receivedAt ? ` pada ${new Date(po.receivedAt).toLocaleString("id-ID")}` : ""}. Stok & cashflow sudah diperbarui otomatis.
        </p>
      )}
    </div>
  );
}

export default function PurchaseOrderDetailPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <PurchaseOrderDetailContent />
      </div>
    </RoleGuard>
  );
}
