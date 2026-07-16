"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RegionCascade } from "@/components/ui/RegionCascade";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { FulfillmentPoint, LocationType } from "@/types";

const TYPE_LABEL: Record<LocationType, string> = {
  RDH: "RDH (Distribution Hub)",
  MART: "RumaCart Mart",
  POINT: "RumaCart Point",
};

function EditLocationContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [point, setPoint] = useState<FulfillmentPoint | null>(null);
  const [rdhOptions, setRdhOptions] = useState<FulfillmentPoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Cuma alat bantu filter dropdown — FulfillmentPoint di backend tidak
  // punya kolom provinsi, dan datanya lama (belum tentu bisa ditelusuri
  // otomatis dari nama kota tersimpan), jadi mulai kosong.
  const [province, setProvince] = useState("");

  useEffect(() => {
    api.get<FulfillmentPoint>(`/points/${id}`).then(setPoint).catch(() => setPoint(null));
    api.get<FulfillmentPoint[]>("/points?type=RDH").then(setRdhOptions).catch(() => setRdhOptions([]));
  }, [id]);

  async function handleSave() {
    if (!point) return;
    if (point.type !== "RDH" && !point.parentHubId) {
      setError("Mart/Point wajib punya RDH induk");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`/points/${point.id}`, {
        name: point.name,
        city: point.city,
        address: point.address,
        phone: point.phone || null,
        latitude: point.latitude,
        longitude: point.longitude,
        serviceRadiusKm: point.serviceRadiusKm ?? null,
        operatingHours: point.operatingHours || null,
        parentHubId: point.type === "RDH" ? null : point.parentHubId,
        isActive: point.isActive,
      });
      setSuccess("Perubahan tersimpan.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!point) {
    return <div className="flex-1 p-6 text-sm text-ink/50">Memuat lokasi...</div>;
  }

  return (
    <div className="flex-1 p-6">
      <button onClick={() => router.back()} className="mb-4 text-sm text-ink/60 hover:text-ink">
        ← Kembali
      </button>
      <h1 className="mb-1 text-2xl font-bold">Edit Lokasi</h1>
      <p className="mb-6 text-sm text-ink/50">{TYPE_LABEL[point.type]} · Kode {point.code} (tipe & kode tidak bisa diubah setelah dibuat)</p>

      <div className="max-w-2xl space-y-4">
        {point.type !== "RDH" && (
          <div className="card">
            <label className="mb-1 block text-sm font-medium">RDH Induk *</label>
            <select
              value={point.parentHubId || ""}
              onChange={(e) => setPoint({ ...point, parentHubId: e.target.value })}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih RDH yang mensuplai lokasi ini</option>
              {rdhOptions.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — {r.city}</option>
              ))}
            </select>
          </div>
        )}

        <div className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nama Lokasi</label>
              <Input value={point.name} onChange={(e) => setPoint({ ...point, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Telepon</label>
              <Input value={point.phone || ""} onChange={(e) => setPoint({ ...point, phone: e.target.value })} placeholder="Opsional" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Kota</p>
            <p className="mb-2 text-xs text-ink/50">Kota saat ini: <span className="font-medium text-ink/70">{point.city}</span>. Pilih ulang di bawah kalau mau ganti.</p>
            <RegionCascade
              province={province}
              city=""
              onChange={(next) => { setProvince(next.province); if (next.city) setPoint({ ...point, city: next.city }); }}
              showKecamatan={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Alamat</label>
            <Input value={point.address} onChange={(e) => setPoint({ ...point, address: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Latitude</label>
              <Input type="number" value={point.latitude} onChange={(e) => setPoint({ ...point, latitude: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Longitude</label>
              <Input type="number" value={point.longitude} onChange={(e) => setPoint({ ...point, longitude: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Radius Layanan (km)</label>
              <Input
                type="number"
                min={0}
                value={point.serviceRadiusKm ?? ""}
                onChange={(e) => setPoint({ ...point, serviceRadiusKm: e.target.value ? Number(e.target.value) : null })}
                placeholder="Opsional"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Jam Operasional</label>
              <Input
                value={point.operatingHours || ""}
                onChange={(e) => setPoint({ ...point, operatingHours: e.target.value })}
                placeholder="Contoh: 08:00 - 21:00"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={point.isActive ?? true}
              onChange={(e) => setPoint({ ...point, isActive: e.target.checked })}
            />
            Lokasi aktif (nonaktifkan kalau tutup/tidak beroperasi sementara)
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-primary">{success}</p>}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </div>
  );
}

export default function EditLocationPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <EditLocationContent />
      </div>
    </RoleGuard>
  );
}
