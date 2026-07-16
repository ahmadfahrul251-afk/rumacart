"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RegionCascade } from "@/components/ui/RegionCascade";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { FulfillmentPoint, LocationType } from "@/types";

const TYPE_OPTIONS: { value: LocationType; label: string; hint: string }[] = [
  { value: "RDH", label: "RDH (Distribution Hub)", hint: "Gudang utama 1 per kota. Satu-satunya yang bisa terima Purchase Order dari supplier." },
  { value: "MART", label: "RumaCart Mart", hint: "Outlet retail besar (50–300 m²), disuplai dari RDH kotanya." },
  { value: "POINT", label: "RumaCart Point", hint: "Pickup point/last-mile kecil (10–40 m²), disuplai dari RDH atau Mart." },
];

function NewLocationContent() {
  const router = useRouter();
  const [rdhOptions, setRdhOptions] = useState<FulfillmentPoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState<LocationType>("POINT");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [province, setProvince] = useState(""); // cuma alat bantu filter dropdown, tidak dikirim ke backend
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [parentHubId, setParentHubId] = useState("");

  useEffect(() => {
    api.get<FulfillmentPoint[]>("/points?type=RDH").then(setRdhOptions).catch(() => setRdhOptions([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name || !code || !city || !address || !latitude || !longitude) {
      setError("Nama, Kode, Kota, Alamat, dan koordinat wajib diisi");
      return;
    }
    if (type !== "RDH" && !parentHubId) {
      setError("Mart/Point wajib punya RDH induk");
      return;
    }
    setSaving(true);
    try {
      await api.post("/points", {
        name,
        code,
        type,
        city,
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        phone: phone || undefined,
        serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : undefined,
        operatingHours: operatingHours || undefined,
        parentHubId: type === "RDH" ? undefined : parentHubId,
      });
      router.push("/dashboard/admin/points");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 p-6">
      <button onClick={() => router.back()} className="mb-4 text-sm text-ink/60 hover:text-ink">
        ← Kembali
      </button>
      <h1 className="mb-6 text-2xl font-bold">Tambah Lokasi</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div className="card space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipe Lokasi *</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-xl border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-light ${
                    type === opt.value ? "border-primary" : "border-black/10"
                  }`}
                >
                  <input type="radio" name="type" className="hidden" checked={type === opt.value} onChange={() => setType(opt.value)} />
                  <p className="font-medium">{opt.label}</p>
                  <p className="mt-1 text-xs text-ink/50">{opt.hint}</p>
                </label>
              ))}
            </div>
          </div>

          {type !== "RDH" && (
            <div>
              <label className="mb-1 block text-sm font-medium">RDH Induk *</label>
              <select
                value={parentHubId}
                onChange={(e) => setParentHubId(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Pilih RDH yang mensuplai lokasi ini</option>
                {rdhOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.city}</option>
                ))}
              </select>
              {rdhOptions.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">Belum ada RDH. Buat RDH dulu di kota ini sebelum menambah Mart/Point.</p>
              )}
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nama Lokasi *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: RDH Makassar" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Kode *</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Contoh: RDH-MKS" />
            </div>
          </div>
          <RegionCascade
            province={province}
            city={city}
            onChange={(next) => { setProvince(next.province); setCity(next.city); }}
            showKecamatan={false}
            required
          />
          <div>
            <label className="mb-1 block text-sm font-medium">Telepon</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opsional" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Alamat *</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat lengkap" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Latitude *</label>
              <Input type="number" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-5.147665" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Longitude *</label>
              <Input type="number" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="119.432732" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Radius Layanan (km)</label>
              <Input type="number" min={0} value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(e.target.value)} placeholder="Opsional" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Jam Operasional</label>
              <Input value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} placeholder="Contoh: 08:00 - 21:00" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Lokasi"}
        </Button>
      </form>
    </div>
  );
}

export default function NewLocationPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <NewLocationContent />
      </div>
    </RoleGuard>
  );
}
