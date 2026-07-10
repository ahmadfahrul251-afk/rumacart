"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Package, Wallet, TrendingUp, TriangleAlert } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { formatRupiah } from "@/lib/utils";

interface InventoryStats { totalProducts: number; lowStock: number; outOfStock: number; inventoryValue: number; }
interface CashflowSummary { cashIn: number; cashOut: number; netCash: number; totalModal: number; totalProfit: number; }

function AdminDashboardContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [cashflow, setCashflow] = useState<CashflowSummary | null>(null);

  useEffect(() => {
    api.get<Order[]>("/orders").then(setOrders).catch(() => setOrders([]));
    api.get<InventoryStats>("/inventory/stats").then(setInventoryStats).catch(() => {});
    api.get<CashflowSummary>("/cashflow/summary").then(setCashflow).catch(() => {});
  }, []);

  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === new Date().toDateString());
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const revenue = orders.filter((o) => o.status === "COMPLETED").reduce((s, o) => s + o.total, 0);
  const belowCostOrders = orders.filter((o) => o.belowCost && o.status !== "CANCELLED");

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard Admin</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Order Hari Ini" value={todayOrders.length} icon={<ShoppingBag size={18} className="text-primary" />} />
        <StatCard label="Order Pending" value={pendingOrders} icon={<ShoppingBag size={18} className="text-secondary" />} />
        <StatCard label="Revenue (Selesai)" value={formatRupiah(revenue)} icon={<TrendingUp size={18} className="text-primary" />} />
        <StatCard label="Cash In - Out" value={cashflow ? formatRupiah(cashflow.netCash) : "..."} icon={<Wallet size={18} className="text-primary" />} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Produk" value={inventoryStats?.totalProducts ?? "..."} icon={<Package size={18} />} />
        <StatCard label="Stok Menipis" value={inventoryStats?.lowStock ?? "..."} />
        <StatCard label="Stok Habis" value={inventoryStats?.outOfStock ?? "..."} />
        <StatCard label="Nilai Inventory" value={inventoryStats ? formatRupiah(inventoryStats.inventoryValue) : "..."} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Modal Kembali (semua waktu)"
          value={cashflow ? formatRupiah(cashflow.totalModal) : "..."}
          icon={<Wallet size={18} className="text-ink/60" />}
        />
        <StatCard
          label="Keuntungan Bersih (semua waktu)"
          value={cashflow ? formatRupiah(cashflow.totalProfit) : "..."}
          icon={<TrendingUp size={18} className={cashflow && cashflow.totalProfit < 0 ? "text-red-600" : "text-primary"} />}
        />
      </div>

      {belowCostOrders.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <p>
            Ada <strong>{belowCostOrders.length} order</strong> yang potongan diskon/vouchernya membuat harga jual di bawah harga modal.
            Cek daftar order di bawah (ditandai badge merah) supaya bisa evaluasi kebijakan voucher.
          </p>
        </div>
      )}

      <div className="mt-6 card overflow-x-auto">
        <p className="mb-3 font-semibold">Order Terbaru</p>
        <table className="w-full text-sm">
          <thead className="text-left text-ink/50">
            <tr>
              <th className="pb-2">No. Order</th>
              <th className="pb-2">Point</th>
              <th className="pb-2">Total</th>
              <th className="pb-2">Status</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map((o) => (
              <tr key={o.id} className="border-t border-black/5">
                <td className="py-2">{o.orderNumber}</td>
                <td className="py-2">{o.point?.name || "-"}</td>
                <td className="py-2">{formatRupiah(o.total)}</td>
                <td className="py-2"><Badge tone={o.status}>{o.status}</Badge></td>
                <td className="py-2">
                  {o.belowCost && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                      <TriangleAlert size={11} /> Di Bawah Modal
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <AdminDashboardContent />
      </div>
    </RoleGuard>
  );
}
