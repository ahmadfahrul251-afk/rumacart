"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { formatRupiah } from "@/lib/utils";

function PaymentVerificationContent() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function load() {
    api
      .get<Order[]>("/orders/awaiting-verification")
      .then(setOrders)
      .catch(() => setOrders([]));
  }

  useEffect(load, []);

  async function verify(order: Order) {
    if (!confirm(`Konfirmasi: uang sebesar ${formatRupiah(order.total)} sudah benar-benar masuk ke rekening untuk order ${order.orderNumber}?`)) {
      return;
    }
    setBusyId(order.id);
    setError("");
    try {
      await api.patch(`/orders/${order.id}/verify-payment`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-1 text-2xl font-bold">Verifikasi Pembayaran</h1>
      <p className="mb-6 text-sm text-ink/60">
        Order dengan metode Transfer Bank yang sudah dikonfirmasi customer, menunggu dicek manual di mutasi rekening.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!orders && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {orders?.length === 0 && (
        <EmptyState icon="✅" title="Tidak ada pembayaran yang menunggu verifikasi" description="Semua transfer sudah diverifikasi." />
      )}

      {orders && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-semibold">{o.orderNumber}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <Clock size={11} /> Menunggu Verifikasi
                  </span>
                </div>
                <p className="text-sm text-ink/60">
                  {o.customer?.name || "Customer"} · {o.items.length} item · {new Date(o.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary">{formatRupiah(o.total)}</span>
                <button
                  onClick={() => verify(o)}
                  disabled={busyId === o.id}
                  className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> {busyId === o.id ? "Memproses..." : "Tandai Lunas"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PaymentVerificationPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "KASIR", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <PaymentVerificationContent />
      </div>
    </RoleGuard>
  );
}
