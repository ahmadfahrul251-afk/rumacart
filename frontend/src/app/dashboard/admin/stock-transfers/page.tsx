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
import { StockTransfer } from "@/types";

function StockTransfersContent() {
  const { user } = useAuth();
  const isPusat = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const isAdminLokasi = user?.role === "ADMIN_POINT";
  const [transfers, setTransfers] = useState<StockTransfer[] | null>(null);

  useEffect(() => {
    api
      .get<StockTransfer[]>("/stock-transfers")
      .then(setTransfers)
      .catch(() => setTransfers([]));
  }, []);

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transfer Stok</h1>
          <p className="text-sm text-ink/60">Pemindahan stok antar lokasi jaringan RumaCart.</p>
        </div>
        {(isPusat || isAdminLokasi) && (
          <Link href="/dashboard/admin/stock-transfers/new" className="btn-primary !py-2 !px-4 text-sm">
            <Plus size={16} /> Kirim Transfer
          </Link>
        )}
      </div>

      {!transfers && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {transfers && transfers.length === 0 && (
        <EmptyState
          icon="🚚"
          title="Belum ada transfer stok"
          description="Kirim transfer stok pertama antar lokasi."
        />
      )}

      {transfers && transfers.length > 0 && (
        <div className="space-y-3">
          {transfers.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/admin/stock-transfers/${t.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 hover:shadow-soft"
            >
              <div>
                <p className="font-semibold">{t.transferNumber}</p>
                <p className="text-sm text-ink/60">
                  {t.fromPoint?.name || "Pusat"} → {t.toPoint?.name || "-"} · {t.items.length} item
                </p>
              </div>
              <Badge tone={t.status}>{t.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StockTransfersPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <StockTransfersContent />
      </div>
    </RoleGuard>
  );
}
