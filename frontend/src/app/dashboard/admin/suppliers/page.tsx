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
import { Supplier, FulfillmentPoint } from "@/types";

const EMPTY_FORM = { name: "", contactName: "", phone: "", email: "", address: "", pointId: "" };

function SuppliersContent() {
  const { user } = useAuth();
  const isPusat = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "GUDANG";
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [points, setPoints] = useState<FulfillmentPoint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setSuppliers(null);
    api
      .get<Supplier[]>("/suppliers?all=1")
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }

  useEffect(load, []);
  useEffect(() => {
    if (isPusat) api.get<FulfillmentPoint[]>("/points").then(setPoints).catch(() => {});
  }, [isPusat]);

  // Admin Point cuma boleh edit supplier lokal miliknya sendiri, bukan yang pusat-wide.
  function canEdit(s: Supplier) {
    if (isPusat) return true;
    return !!s.pointId && s.pointId === user?.managedPointId;
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      contactName: s.contactName || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      pointId: s.pointId || "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama supplier wajib diisi");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!isPusat) delete payload.pointId; // Admin Point: pointId dipaksa server ke Point-nya sendiri
      if (editingId) {
        await api.patch(`/suppliers/${editingId}`, payload);
      } else {
        await api.post("/suppliers", payload);
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Supplier) {
    if (s.isActive) {
      await api.delete(`/suppliers/${s.id}`);
    } else {
      await api.patch(`/suppliers/${s.id}`, { isActive: true });
    }
    load();
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supplier</h1>
        <Button onClick={startCreate} className="!py-2 !px-4 text-sm">
          <Plus size={16} /> Tambah Supplier
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
          <h2 className="font-semibold">{editingId ? "Edit Supplier" : "Supplier Baru"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nama Supplier *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nama Kontak</label>
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">No. HP</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Alamat</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            {isPusat && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Point</label>
                <select
                  value={form.pointId}
                  onChange={(e) => setForm({ ...form, pointId: e.target.value })}
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Pusat-wide (dipakai semua Point)</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (lokal)</option>
                  ))}
                </select>
              </div>
            )}
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

      {!suppliers && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {suppliers && suppliers.length === 0 && (
        <EmptyState icon="🏭" title="Belum ada supplier" description="Tambahkan supplier pertama untuk mulai membuat Purchase Order." />
      )}

      {suppliers && suppliers.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink/50">
              <tr>
                <th className="pb-2">Nama</th>
                <th className="pb-2">Kontak</th>
                <th className="pb-2">Telepon</th>
                {isPusat && <th className="pb-2">Point</th>}
                <th className="pb-2">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-black/5">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2 text-ink/60">{s.contactName || "-"}</td>
                  <td className="py-2 text-ink/60">{s.phone || "-"}</td>
                  {isPusat && <td className="py-2 text-ink/60">{s.point?.name || "Pusat-wide"}</td>}
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {canEdit(s) ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(s)}
                          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => toggleActive(s)}
                          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-red-100 hover:text-red-600"
                        >
                          {s.isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                          {s.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-ink/40">Milik Pusat</span>
                    )}
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

export default function SuppliersPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <SuppliersContent />
      </div>
    </RoleGuard>
  );
}
