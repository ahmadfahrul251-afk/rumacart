"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Order } from "@/types";

function KurirContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  function load() {
    api.get<Order[]>("/orders/courier/assigned").then(setOrders).catch(() => setOrders([]));
  }
  useEffect(load, []);

  async function ambilOrder(order: Order) {
    await api.patch(`/orders/${order.id}/status`, { status: "SHIPPED", courierId: user?.id });
    load();
  }
  async function selesaikanOrder(order: Order) {
    await api.patch(`/orders/${order.id}/status`, { status: "COMPLETED" });
    load();
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard Kurir</h1>
      <p className="mb-4 text-sm text-ink/60">Order siap antar & pengiriman yang sedang kamu bawa.</p>

      {orders.length === 0 ? (
        <EmptyState icon="🛵" title="Tidak ada order untuk saat ini" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{o.orderNumber}</p>
                <p className="text-sm text-ink/60">{o.point?.name} · {o.point?.city}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={o.status}>{o.status === "PICKED_UP" ? "Siap Diambil" : "Sedang Diantar"}</Badge>
                {o.status === "PICKED_UP" && (
                  <button onClick={() => ambilOrder(o)} className="btn-primary !py-2 !px-4 text-sm">Ambil & Antar</button>
                )}
                {o.status === "SHIPPED" && (
                  <button onClick={() => selesaikanOrder(o)} className="btn-secondary !py-2 !px-4 text-sm">Selesai Diantar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KurirDashboardPage() {
  return (
    <RoleGuard allow={["KURIR", "ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="KURIR" />
        <KurirContent />
      </div>
    </RoleGuard>
  );
}
