"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RegionCascade } from "@/components/ui/RegionCascade";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { DeliveryArea, FulfillmentPoint } from "@/types";
import { formatRupiah } from "@/lib/utils";

// `province` cuma alat bantu filter di dropdown (biar daftar kota lebih
// ringkas) — DeliveryArea di backend tidak punya kolom provinsi, jadi tidak
// ikut dikirim saat submit.
const EMPTY_FORM = { pointId: "", province: "", kecamatan: "", city: "", cost: "" };

function DeliveryAreasContent() {
  const { user } = useAuth();
  const isPusat = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [areas, setAreas] = useState<DeliveryArea[] | null>(null);
  const [points, setPoints] = useState<FulfillmentPoint[]>([]);
  const [filterPointId, setFilterPointId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  function load() {
    setAreas(null);
    const qs = isPusat && filterPointId ? `?pointId=${filterPointId}` : "";
    api.get<DeliveryArea[]>(`/delivery-areas${qs}`).then(setAreas).catch(() => setAreas([]));
  }

  useEffect(load, [filterPointId]);
  useEffect(() => {
    if (isPusat) {
      api.get<FulfillmentPoint[]>("/points?type=POINT").then((res) => {
        api.get<FulfillmentPoint[]>("/points?type=MART").then((mart) => setPoints([...res, ...mart]));
      });
    }
  }, [isPusat]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.kecamatan.trim() || !form.city.trim() || !form.cost) {
      setError("Kecamatan, kota, dan biaya wajib diisi");
      return;
    }
    if (isPusat && !form.pointId) {
      setError("Pilih Point dulu");
      return;
    }
    setSaving(true);
    try {
      await api.post("/delivery-areas", {
        pointId: isPusat ? form.pointId : undefined,
        kecamatan: form.kecamatan.trim(),
        city: form.city.trim(),
        cost: Number(form.cost),
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(area: DeliveryArea) {
    setBusyId(area.id);
    try {
      await api.patch(`/delivery-areas/${area.id}`, { isActive: !area.isActive });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus area pengiriman ini?")) return;
    setBusyId(id);
    try {
      await api.delete(`/delivery-areas/${id}`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Area Pengiriman</h1>
          <p className="text-sm text-ink/60">
            Atur kecamatan mana saja yang bisa dijangkau kurir tiap Point/Mart, dan biaya antarnya.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} className="!py-2 !px-4 text-sm">
          <Plus size={16} /> Tambah Area
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-3">
          <h2 className="font-semibold">Tambah / Update Area Pengiriman</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {isPusat && (
              <div>
                <label className="mb-1 block text-sm font-medium">Point/Mart *</label>
                <select
                  value={form.pointId}
                  onChange={(e) => setForm({ ...form, pointId: e.target.value })}
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Pilih lokasi</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Biaya Antar (Rp) *</label>
              <Input type="number" min={0} value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
          </div>
          <RegionCascade
            province={form.province}
            city={form.city}
            kecamatan={form.kecamatan}
            onChange={(next) => setForm({ ...form, ...next })}
            required
          />
          <p className="text-xs text-ink/40">Kalau kecamatan+kota yang sama sudah ada buat lokasi ini, biayanya otomatis di-update (bukan bikin baris baru).</p>
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

      {isPusat && (
        <div className="mb-4">
          <select
            value={filterPointId}
            onChange={(e) => setFilterPointId(e.target.value)}
            className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Semua lokasi</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
        </div>
      )}

      {error && !showForm && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!areas && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      )}

      {areas && areas.length === 0 && (
        <EmptyState icon="🚚" title="Belum ada area pengiriman" description="Tambah kecamatan yang bisa dijangkau kurir Point ini." />
      )}

      {areas && areas.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-ink/50">
              <tr>
                {isPusat && <th className="pb-2">Lokasi</th>}
                <th className="pb-2">Kecamatan</th>
                <th className="pb-2">Kota</th>
                <th className="pb-2">Biaya</th>
                <th className="pb-2">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} className="border-t border-black/5">
                  {isPusat && <td className="py-2">{a.point?.name} <span className="text-xs text-ink/40">({a.point?.code})</span></td>}
                  <td className="py-2">{a.kecamatan}</td>
                  <td className="py-2 text-ink/60">{a.city}</td>
                  <td className="py-2">{formatRupiah(a.cost)}</td>
                  <td className="py-2">
                    <button
                      onClick={() => handleToggleActive(a)}
                      disabled={busyId === a.id}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${a.isActive ? "bg-primary-light text-primary" : "bg-red-50 text-red-600"}`}
                    >
                      {a.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={busyId === a.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
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

export default function DeliveryAreasPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <DeliveryAreasContent />
      </div>
    </RoleGuard>
  );
}
