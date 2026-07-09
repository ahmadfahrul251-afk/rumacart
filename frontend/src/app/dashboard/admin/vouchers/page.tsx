"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Voucher } from "@/types";
import { formatRupiah } from "@/lib/utils";

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "FLAT" as "FLAT" | "PERCENT",
  discountAmount: "",
  maxDiscount: "",
  minPurchase: "",
  quota: "100",
  expiresAt: "",
};

function VouchersContent() {
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setVouchers(null);
    api
      .get<Voucher[]>("/vouchers?all=1")
      .then(setVouchers)
      .catch(() => setVouchers([]));
  }

  useEffect(load, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function startEdit(v: Voucher) {
    setEditingId(v.id);
    setForm({
      code: v.code,
      description: v.description || "",
      discountType: v.discountType,
      discountAmount: String(v.discountAmount),
      maxDiscount: v.maxDiscount ? String(v.maxDiscount) : "",
      minPurchase: String(v.minPurchase),
      quota: String(v.quota),
      expiresAt: v.expiresAt ? v.expiresAt.slice(0, 10) : "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.discountAmount) {
      setError("Kode voucher dan nilai diskon wajib diisi");
      return;
    }
    if (form.discountType === "PERCENT" && (Number(form.discountAmount) < 1 || Number(form.discountAmount) > 100)) {
      setError("Untuk tipe persen, nilai diskon harus 1-100");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description || undefined,
        discountType: form.discountType,
        discountAmount: form.discountAmount,
        maxDiscount: form.maxDiscount || undefined,
        minPurchase: form.minPurchase || 0,
        quota: form.quota || 100,
        expiresAt: form.expiresAt || undefined,
      };
      if (editingId) {
        await api.patch(`/vouchers/${editingId}`, payload);
      } else {
        await api.post("/vouchers", payload);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(v: Voucher) {
    if (v.isActive) {
      await api.delete(`/vouchers/${v.id}`);
    } else {
      await api.patch(`/vouchers/${v.id}`, { isActive: true });
    }
    load();
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voucher & Promo</h1>
          <p className="text-sm text-ink/60">Voucher baru otomatis dikirim sebagai notifikasi ke semua customer.</p>
        </div>
        <Button onClick={startCreate} className="!py-2 !px-4 text-sm">
          <Plus size={16} /> Tambah Voucher
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
          <h2 className="font-semibold">{editingId ? "Edit Voucher" : "Voucher Baru"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Kode Voucher *</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="HEMAT10"
                disabled={!!editingId}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Deskripsi</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Diskon spesial akhir bulan" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tipe Diskon</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "FLAT" | "PERCENT" })}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="FLAT">Potongan Nominal (Rp)</option>
                <option value="PERCENT">Potongan Persen (%)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {form.discountType === "PERCENT" ? "Nilai Diskon (%) *" : "Nilai Diskon (Rp) *"}
              </label>
              <Input
                type="number"
                value={form.discountAmount}
                onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
                placeholder={form.discountType === "PERCENT" ? "10" : "15000"}
                required
              />
            </div>
            {form.discountType === "PERCENT" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Maks. Potongan (Rp)</label>
                <Input
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="Opsional, contoh 20000"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Min. Belanja (Rp)</label>
              <Input type="number" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Kuota Pemakaian</label>
              <Input type="number" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Berlaku Sampai</label>
              <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="!py-2 !px-4 text-sm">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {!vouchers && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {vouchers && vouchers.length === 0 && (
        <EmptyState icon="🎟️" title="Belum ada voucher" description="Tambahkan voucher pertama untuk menarik minat belanja customer." />
      )}

      {vouchers && vouchers.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink/50">
              <tr>
                <th className="pb-2">Kode</th>
                <th className="pb-2">Diskon</th>
                <th className="pb-2">Min. Belanja</th>
                <th className="pb-2">Pemakaian</th>
                <th className="pb-2">Berlaku Sampai</th>
                <th className="pb-2">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-t border-black/5">
                  <td className="py-2 font-medium">{v.code}</td>
                  <td className="py-2 text-ink/60">
                    {v.discountType === "PERCENT"
                      ? `${v.discountAmount}%${v.maxDiscount ? ` (maks ${formatRupiah(v.maxDiscount)})` : ""}`
                      : formatRupiah(v.discountAmount)}
                  </td>
                  <td className="py-2 text-ink/60">{v.minPurchase > 0 ? formatRupiah(v.minPurchase) : "-"}</td>
                  <td className="py-2 text-ink/60">{v.used}/{v.quota}</td>
                  <td className="py-2 text-ink/60">
                    {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "-"}
                  </td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {v.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(v)}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => toggleActive(v)}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-red-100 hover:text-red-600"
                      >
                        {v.isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                        {v.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function VouchersPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <VouchersContent />
      </div>
    </RoleGuard>
  );
}
