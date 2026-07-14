"use client";

import { useEffect, useState } from "react";
import { Store, Boxes, Wallet, TriangleAlert } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PointMonitoring } from "@/types";
import { formatRupiah } from "@/lib/utils";

function PointsMonitoringContent() {
  const [points, setPoints] = useState<PointMonitoring[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function load() {
    setPoints(null);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    api.get<PointMonitoring[]>(`/points/monitoring${qs}`).then(setPoints).catch(() => setPoints([]));
  }

  useEffect(load, [from, to]);

  const totals = points?.reduce(
    (acc, p) => ({
      claimedProducts: acc.claimedProducts + p.claimedProducts,
      stockValue: acc.stockValue + p.stockValue,
      orderCount: acc.orderCount + p.orderCount,
      revenue: acc.revenue + p.revenue,
    }),
    { claimedProducts: 0, stockValue: 0, orderCount: 0, revenue: 0 }
  );

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Monitoring Point</h1>
        <p className="text-sm text-ink/60">Ringkasan inventaris & penjualan tiap Point/Pickup Point.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Dari Tanggal</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Sampai Tanggal</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo(""); }} className="pb-2.5 text-xs font-medium text-primary hover:underline">
            Reset filter
          </button>
        )}
        {!(from || to) && (
          <p className="pb-2.5 text-xs text-ink/40">Ringkasan penjualan di bawah ini sejak awal (kosongkan filter tanggal). Nilai stok selalu kondisi saat ini.</p>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jumlah Point" value={points ? points.length : "..."} icon={<Store size={18} className="text-primary" />} />
        <StatCard label="Total Produk Diklaim" value={totals ? totals.claimedProducts : "..."} icon={<Boxes size={18} className="text-ink/60" />} />
        <StatCard label="Total Nilai Stok" value={totals ? formatRupiah(totals.stockValue) : "..."} icon={<Wallet size={18} />} />
        <StatCard label="Total Omzet" value={totals ? formatRupiah(totals.revenue) : "..."} icon={<Wallet size={18} className="text-primary" />} />
      </div>

      <div className="card overflow-x-auto">
        <p className="mb-3 font-semibold">Daftar Point</p>

        {!points && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {points?.length === 0 && <p className="py-6 text-center text-sm text-ink/40">Belum ada Point.</p>}

        {points && points.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-ink/50">
              <tr>
                <th className="pb-2">Point</th>
                <th className="pb-2">Kota</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Produk Diklaim</th>
                <th className="pb-2">Nilai Stok</th>
                <th className="pb-2">Stok Menipis/Habis</th>
                <th className="pb-2">Order</th>
                <th className="pb-2 text-right">Omzet</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="py-2">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-ink/40">{p.code}</p>
                  </td>
                  <td className="py-2 text-ink/60">{p.city}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.isActive ? "bg-primary-light text-primary" : "bg-red-50 text-red-600"}`}>
                      {p.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-2">{p.claimedProducts}</td>
                  <td className="py-2">{formatRupiah(p.stockValue)}</td>
                  <td className="py-2">
                    {p.lowStockCount + p.outOfStockCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <TriangleAlert size={13} /> {p.lowStockCount} menipis · {p.outOfStockCount} habis
                      </span>
                    ) : (
                      <span className="text-xs text-ink/40">Aman</span>
                    )}
                  </td>
                  <td className="py-2">{p.orderCount}</td>
                  <td className="py-2 text-right font-medium">{formatRupiah(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function PointsMonitoringPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <PointsMonitoringContent />
      </div>
    </RoleGuard>
  );
}
