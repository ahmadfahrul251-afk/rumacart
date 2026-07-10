"use client";

import { useEffect, useState } from "react";
import { Plus, TrendingUp, TrendingDown, Wallet, PiggyBank, TriangleAlert } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Cashflow } from "@/types";
import { formatRupiah } from "@/lib/utils";

interface CashflowSummary { cashIn: number; cashOut: number; netCash: number; totalModal: number; totalProfit: number; }

const EMPTY_FORM = { type: "OUT" as "IN" | "OUT", category: "", amount: "", description: "" };

function CashflowContent() {
  const [entries, setEntries] = useState<Cashflow[] | null>(null);
  const [summary, setSummary] = useState<CashflowSummary | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setEntries(null);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    api.get<Cashflow[]>(`/cashflow${qs}`).then(setEntries).catch(() => setEntries([]));
    api.get<CashflowSummary>(`/cashflow/summary${qs}`).then(setSummary).catch(() => {});
  }

  useEffect(load, [from, to]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category.trim() || !form.amount) {
      setError("Kategori dan jumlah wajib diisi");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/cashflow", { ...form, amount: Number(form.amount) });
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cashflow</h1>
          <p className="text-sm text-ink/60">Modal & keuntungan dipisah otomatis dari tiap penjualan.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} className="!py-2 !px-4 text-sm">
          <Plus size={16} /> Catat Transaksi Manual
        </Button>
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
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
          <h2 className="font-semibold">Transaksi Manual</h2>
          <p className="text-xs text-ink/50">Untuk pengeluaran/pemasukan di luar penjualan otomatis, misalnya gaji, sewa, atau biaya operasional.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Tipe</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "IN" | "OUT" })}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="OUT">Uang Keluar</option>
                <option value="IN">Uang Masuk</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Kategori</label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Gaji, Sewa, dll" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Jumlah (Rp)</label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Keterangan</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opsional" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="!py-2 !px-4 text-sm">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-accent">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Uang Masuk" value={summary ? formatRupiah(summary.cashIn) : "..."} icon={<TrendingUp size={18} className="text-primary" />} />
        <StatCard label="Uang Keluar" value={summary ? formatRupiah(summary.cashOut) : "..."} icon={<TrendingDown size={18} className="text-red-500" />} />
        <StatCard label="Saldo Bersih" value={summary ? formatRupiah(summary.netCash) : "..."} icon={<Wallet size={18} />} />
        <StatCard label="Modal Kembali" value={summary ? formatRupiah(summary.totalModal) : "..."} icon={<PiggyBank size={18} className="text-ink/60" />} />
        <StatCard
          label="Keuntungan Bersih"
          value={summary ? formatRupiah(summary.totalProfit) : "..."}
          icon={<TrendingUp size={18} className={summary && summary.totalProfit < 0 ? "text-red-600" : "text-primary"} />}
        />
      </div>

      {summary && summary.totalProfit < 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <p>Total keuntungan pada rentang ini <strong>negatif</strong> — diskon/voucher yang dipakai kemungkinan lebih besar dari margin produk. Cek daftar order yang bertanda "Di Bawah Modal" di Overview.</p>
        </div>
      )}

      <div className="mt-6 card overflow-x-auto">
        <p className="mb-3 font-semibold">Riwayat Transaksi</p>

        {!entries && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        )}

        {entries?.length === 0 && (
          <EmptyState icon="💸" title="Belum ada transaksi" description="Transaksi penjualan otomatis akan muncul di sini." />
        )}

        {entries && entries.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-ink/50">
              <tr>
                <th className="pb-2">Tanggal</th>
                <th className="pb-2">Kategori</th>
                <th className="pb-2">Keterangan</th>
                <th className="pb-2">Modal / Untung</th>
                <th className="pb-2 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-black/5">
                  <td className="py-2 text-ink/60">{new Date(e.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}</td>
                  <td className="py-2">{e.category}</td>
                  <td className="py-2 text-ink/60">{e.description || "-"}</td>
                  <td className="py-2 text-xs text-ink/60">
                    {e.costAmount != null && e.profitAmount != null ? (
                      <span className={e.profitAmount < 0 ? "text-red-600" : ""}>
                        Modal {formatRupiah(e.costAmount)} · Untung {formatRupiah(e.profitAmount)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={`py-2 text-right font-medium ${e.type === "IN" ? "text-primary" : "text-red-600"}`}>
                    {e.type === "IN" ? "+" : "-"}{formatRupiah(e.amount)}
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

export default function CashflowPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <CashflowContent />
      </div>
    </RoleGuard>
  );
}
