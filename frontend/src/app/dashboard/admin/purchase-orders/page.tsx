"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PurchaseOrder } from "@/types";
import { formatRupiah } from "@/lib/utils";

function PurchaseOrdersContent() {
  const [pos, setPos] = useState<PurchaseOrder[] | null>(null);

  useEffect(() => {
    api
      .get<PurchaseOrder[]>("/purchase-orders")
      .then(setPos)
      .catch(() => setPos([]));
  }, []);

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Order</h1>
        <Link href="/dashboard/admin/purchase-orders/new" className="btn-primary !py-2 !px-4 text-sm">
          <Plus size={16} /> Buat PO
        </Link>
      </div>

      {!pos && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {pos && pos.length === 0 && (
        <EmptyState icon="📋" title="Belum ada Purchase Order" description="Buat PO untuk mencatat pembelian stok dari supplier." />
      )}

      {pos && pos.length > 0 && (
        <div className="space-y-3">
          {pos.map((po) => (
            <Link
              key={po.id}
              href={`/dashboard/admin/purchase-orders/${po.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 hover:shadow-soft"
            >
              <div>
                <p className="font-semibold">{po.poNumber}</p>
                <p className="text-sm text-ink/60">
                  {po.supplier?.name || "-"} · {po.point?.name || "-"} · {po.items.length} item
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{formatRupiah(po.totalAmount)}</span>
                <Badge tone={po.status}>{po.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <PurchaseOrdersContent />
      </div>
    </RoleGuard>
  );
}
