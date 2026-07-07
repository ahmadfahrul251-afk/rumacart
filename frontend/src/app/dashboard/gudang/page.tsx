"use client";

import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { formatRupiah } from "@/lib/utils";

const NEXT_STATUS: Record<string, string> = {
  PENDING: "PROCESSED",
  PROCESSED: "PREPARED",
  PREPARED: "PICKED_UP",
};
const ACTION_LABEL: Record<string, string> = {
  PENDING: "Proses Order",
  PROCESSED: "Tandai Disiapkan",
  PREPARED: "Tandai Diambil Kurir",
};

function GudangContent() {
  const [orders, setOrders] = useState<Order[]>([]);

  function load() {
    api.get<Order[]>("/orders").then((all) =>
      setOrders(all.filter((o) => ["PENDING", "PROCESSED", "PREPARED"].includes(o.status)))
    );
  }

  useEffect(load, []);

  async function advance(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await api.patch(`/orders/${order.id}/status`, { status: next });
    load();
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard Gudang</h1>
      <p className="mb-4 text-sm text-ink/60">Order masuk yang perlu di-picking, packing, lalu diserahkan ke kurir.</p>

      {orders.length === 0 ? (
        <EmptyState icon="📦" title="Tidak ada order yang perlu diproses" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{o.orderNumber}</p>
                <p className="text-sm text-ink/60">{o.items.length} item · {formatRupiah(o.total)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={o.status}>{o.status}</Badge>
                <button onClick={() => advance(o)} className="btn-primary !py-2 !px-4 text-sm">
                  {ACTION_LABEL[o.status]}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GudangDashboardPage() {
  return (
    <RoleGuard allow={["GUDANG", "ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="GUDANG" />
        <GudangContent />
      </div>
    </RoleGuard>
  );
}
