"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PackageCheck, XCircle } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { StockTransfer } from "@/types";

function StockTransferDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isPusat = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api
      .get<StockTransfer>(`/stock-transfers/${id}`)
      .then(setTransfer)
      .catch(() => setTransfer(null));
  }

  useEffect(load, [id]);

  async function handleReceive() {
    if (!confirm("Konfirmasi barang sudah diterima di Point ini? Stok akan bertambah otomatis.")) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(`/stock-transfers/${id}/receive`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Batalkan transfer stok ini?")) return;
    setBusy(true);
    setError("");
    try {
      await api.patch(`/stock-transfers/${id}/cancel`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!transfer) {
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
          <h1 className="text-2xl font-bold">{transfer.transferNumber}</h1>
          <p className="text-sm text-ink/60">Tujuan: {transfer.toPoint?.name}</p>
        </div>
        <Badge tone={transfer.status}>{transfer.status}</Badge>
      </div>

      <div className="card mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-ink/50">
            <tr>
              <th className="pb-2">Produk</th>
              <th className="pb-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {transfer.items.map((item) => (
              <tr key={item.id} className="border-t border-black/5">
                <td className="py-2">{item.product?.name || item.productId}</td>
                <td className="py-2 text-right">{item.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transfer.notes && (
        <div className="card mb-4">
          <p className="text-xs text-ink/50">Catatan</p>
          <p className="text-sm">{transfer.notes}</p>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {transfer.status === "SENT" && (
        <div className="flex gap-3">
          <button
            onClick={handleReceive}
            disabled={busy}
            className="btn-primary !py-2.5 !px-5 text-sm disabled:opacity-50"
          >
            <PackageCheck size={16} /> Konfirmasi Diterima
          </button>
          {isPusat && (
            <button
              onClick={handleCancel}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle size={16} /> Batalkan
            </button>
          )}
        </div>
      )}

      {transfer.status === "RECEIVED" && (
        <p className="text-sm text-green-700">
          Stok sudah diterima{transfer.receivedAt ? ` pada ${new Date(transfer.receivedAt).toLocaleString("id-ID")}` : ""} dan otomatis masuk ke inventory Point tujuan.
        </p>
      )}

      {transfer.status === "CANCELLED" && (
        <p className="text-sm text-ink/50">Transfer ini sudah dibatalkan.</p>
      )}
    </div>
  );
}

export default function StockTransferDetailPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <StockTransferDetailContent />
      </div>
    </RoleGuard>
  );
}
