"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Package, Wallet, TrendingUp } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { Order } from "@/types";
import { formatRupiah } from "@/lib/utils";

interface InventoryStats { totalProducts: number; lowStock: number; outOfStock: number; inventoryValue: number; }
interface CashflowSummary { cashIn: number; cashOut: number; netCash: number; }

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

      <div className="mt-6 card overflow-x-auto">
        <p className="mb-3 font-semibold">Order Terbaru</p>
        <table className="w-full text-sm">
          <thead className="text-left text-ink/50">
            <tr>
              <th className="pb-2">No. Order</th>
              <th className="pb-2">Point</th>
              <th className="pb-2">Total</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map((o) => (
              <tr key={o.id} className="border-t border-black/5">
                <td className="py-2">{o.orderNumber}</td>
                <td className="py-2">{o.point?.name || "-"}</td>
                <td className="py-2">{formatRupiah(o.total)}</td>
                <td className="py-2"><Badge tone={o.status}>{o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="ADMIN" />
        <AdminDashboardContent />
      </div>
    </RoleGuard>
  );
}
