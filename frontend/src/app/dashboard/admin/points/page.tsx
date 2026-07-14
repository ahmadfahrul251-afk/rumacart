"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Boxes, Wallet, TriangleAlert, Plus, Pencil, Warehouse, ShoppingBag, MapPin, Users, Truck, TrendingUp } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PointMonitoring, NetworkSummary, LocationType, TopProduct, CitySales } from "@/types";
import { formatRupiah } from "@/lib/utils";

const TYPE_LABEL: Record<LocationType, string> = { RDH: "RDH", MART: "Mart", POINT: "Point" };
const TYPE_BADGE: Record<LocationType, string> = {
  RDH: "bg-amber-50 text-amber-700",
  MART: "bg-blue-50 text-blue-700",
  POINT: "bg-primary-light text-primary",
};

function PointsMonitoringContent() {
  const [locations, setLocations] = useState<PointMonitoring[] | null>(null);
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByCity, setSalesByCity] = useState<CitySales[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | LocationType>("ALL");

  function load() {
    setLocations(null);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    api
      .get<{ summary: NetworkSummary; locations: PointMonitoring[]; topProducts: TopProduct[]; salesByCity: CitySales[] }>(
        `/points/monitoring${qs}`
      )
      .then((res) => {
        setSummary(res.summary);
        setLocations(res.locations);
        setTopProducts(res.topProducts || []);
        setSalesByCity(res.salesByCity || []);
      })
      .catch(() => setLocations([]));
  }

  useEffect(load, [from, to]);

  const visible = typeFilter === "ALL" ? locations : locations?.filter((p) => p.type === typeFilter);

  const totals = locations?.reduce(
    (acc, p) => ({
      claimedProducts: acc.claimedProducts + p.claimedProducts,
      stockValue: acc.stockValue + p.stockValue,
      orderCount: acc.orderCount + p.orderCount,
      revenue: acc.revenue + p.revenue,
      profit: acc.profit + p.profit,
    }),
    { claimedProducts: 0, stockValue: 0, orderCount: 0, revenue: 0, profit: 0 }
  );

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lokasi & Jaringan</h1>
          <p className="text-sm text-ink/60">Jaringan distribusi RumaCart: RDH → Mart → Point.</p>
        </div>
        <Link
          href="/dashboard/admin/points/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={16} /> Tambah Lokasi
        </Link>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Kota" value={summary ? summary.totalCities : "..."} icon={<MapPin size={18} className="text-primary" />} />
        <StatCard label="Total RDH" value={summary ? summary.totalRDH : "..."} icon={<Warehouse size={18} className="text-amber-600" />} />
        <StatCard label="Total Mart" value={summary ? summary.totalMart : "..."} icon={<Store size={18} className="text-blue-600" />} />
        <StatCard label="Total Point" value={summary ? summary.totalPoint : "..."} icon={<ShoppingBag size={18} className="text-primary" />} />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Customer" value={summary ? summary.totalCustomers : "..."} icon={<Users size={18} className="text-blue-600" />} />
        <StatCard label="Total Kurir" value={summary ? summary.totalKurir : "..."} icon={<Truck size={18} className="text-amber-600" />} />
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
        <div className="flex gap-1.5">
          {(["ALL", "RDH", "MART", "POINT"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                typeFilter === t ? "bg-primary text-white" : "bg-accent text-ink/70 hover:bg-primary-light"
              }`}
            >
              {t === "ALL" ? "Semua Tipe" : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo(""); }} className="pb-2.5 text-xs font-medium text-primary hover:underline">
            Reset filter tanggal
          </button>
        )}
        {!(from || to) && (
          <p className="pb-2.5 text-xs text-ink/40">Ringkasan penjualan sejak awal (kosongkan filter tanggal). Nilai stok selalu kondisi saat ini.</p>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Produk Diklaim" value={totals ? totals.claimedProducts : "..."} icon={<Boxes size={18} className="text-ink/60" />} />
        <StatCard label="Total Nilai Stok" value={totals ? formatRupiah(totals.stockValue) : "..."} icon={<Wallet size={18} />} />
        <StatCard label="Total Omzet" value={totals ? formatRupiah(totals.revenue) : "..."} icon={<Wallet size={18} className="text-primary" />} />
        <StatCard label="Total Profit" value={totals ? formatRupiah(totals.profit) : "..."} icon={<TrendingUp size={18} className="text-emerald-600" />} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="mb-1 font-semibold">Produk Terlaris</p>
          <p className="mb-3 text-xs text-ink/40">Top 5 nasional, berdasarkan jumlah unit terjual di rentang tanggal ini.</p>
          {topProducts.length === 0 && <p className="py-4 text-center text-sm text-ink/40">Belum ada penjualan.</p>}
          {topProducts.length > 0 && (
            <div className="space-y-2">
              {topProducts.map((tp, i) => (
                <div key={tp.productId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-xs font-medium text-ink/60">{i + 1}</span>
                    {tp.name}
                  </span>
                  <span className="text-ink/60">{tp.qtySold} unit · {formatRupiah(tp.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <p className="mb-1 font-semibold">Penjualan per Kota</p>
          <p className="mb-3 text-xs text-ink/40">
            Ringkasan tabel per kota (belum ada peta sebaran di stack ini — daftar ini jadi penggantinya sementara).
          </p>
          {salesByCity.length === 0 && <p className="py-4 text-center text-sm text-ink/40">Belum ada penjualan.</p>}
          {salesByCity.length > 0 && (
            <div className="space-y-2">
              {salesByCity.map((c) => (
                <div key={c.city} className="flex items-center justify-between text-sm">
                  <span>{c.city}</span>
                  <span className="text-ink/60">{c.orderCount} order · {formatRupiah(c.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <p className="mb-3 font-semibold">Daftar Lokasi</p>

        {!locations && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {locations?.length === 0 && <p className="py-6 text-center text-sm text-ink/40">Belum ada lokasi. Mulai dengan menambah RDH pertama.</p>}

        {visible && visible.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-ink/50">
              <tr>
                <th className="pb-2">Lokasi</th>
                <th className="pb-2">Tipe</th>
                <th className="pb-2">Kota</th>
                <th className="pb-2">RDH Induk</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Produk Diklaim</th>
                <th className="pb-2">Nilai Stok</th>
                <th className="pb-2">Stok Menipis/Habis</th>
                <th className="pb-2">Order</th>
                <th className="pb-2 text-right">Omzet</th>
                <th className="pb-2 text-right">Profit</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="py-2">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-ink/40">{p.code}</p>
                  </td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[p.type]}`}>{TYPE_LABEL[p.type]}</span>
                  </td>
                  <td className="py-2 text-ink/60">{p.city}</td>
                  <td className="py-2 text-ink/50">{p.parentHubName || (p.type === "RDH" ? "—" : "Belum diatur")}</td>
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
                  <td className="py-2 text-right font-medium text-emerald-600">{formatRupiah(p.profit)}</td>
                  <td className="py-2 text-right">
                    <Link
                      href={`/dashboard/admin/points/${p.id}/edit`}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
                    >
                      <Pencil size={13} /> Edit
                    </Link>
                  </td>
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
