"use client";

import { useEffect, useState } from "react";
import { PackageCheck, XCircle, Truck, Plus } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { RestockRequest, RestockRequestStatus, FulfillmentPoint, Product, ProductVariant } from "@/types";

interface VariantOption { product: Product; variant: ProductVariant; }

function variantLabel(o: VariantOption) {
  const name = !o.variant.name || o.variant.name === "Default" ? o.product.name : `${o.product.name} (${o.variant.name})`;
  return `${name} — ${o.variant.sku}`;
}

const STATUS_TABS: { value: "ALL" | RestockRequestStatus; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING", label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "FULFILLED", label: "Selesai" },
  { value: "REJECTED", label: "Ditolak" },
];

const EMPTY_FORM = { variantId: "", qty: "", sourceHubId: "", note: "" };

function RestockRequestsContent() {
  const { user } = useAuth();
  const isPusat = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [requests, setRequests] = useState<RestockRequest[] | null>(null);
  const [tab, setTab] = useState<"ALL" | RestockRequestStatus>("ALL");
  const [points, setPoints] = useState<FulfillmentPoint[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  function load() {
    setRequests(null);
    const qs = tab !== "ALL" ? `?status=${tab}` : "";
    api.get<RestockRequest[]>(`/restock-requests${qs}`).then(setRequests).catch(() => setRequests([]));
  }

  useEffect(load, [tab]);
  useEffect(() => {
    api.get<FulfillmentPoint[]>("/points").then(setPoints).catch(() => {});
    api.get<{ items: Product[] }>("/products?limit=100").then((res) => setProducts(res.items)).catch(() => {});
  }, []);

  const variantOptions: VariantOption[] = products.flatMap((p) => (p.variants || []).map((v) => ({ product: p, variant: v })));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.variantId || !form.qty) {
      setError("Produk dan jumlah wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.post("/restock-requests", {
        variantId: form.variantId,
        qty: Number(form.qty),
        sourceHubId: form.sourceHubId || undefined,
        note: form.note || undefined,
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

  async function handleApprove(r: RestockRequest) {
    let sourceHubId = r.sourceHubId || "";
    if (!sourceHubId) {
      const chosen = prompt("Lokasi sumber (RDH/Mart) yang mensuplai — masukkan kode lokasi:");
      const match = points.find((p) => p.code === chosen);
      if (!match) return;
      sourceHubId = match.id;
    }
    setBusyId(r.id);
    setError("");
    try {
      await api.patch(`/restock-requests/${r.id}/approve`, { sourceHubId });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function handleReject(id: string) {
    if (!confirm("Tolak Restock Request ini?")) return;
    setBusyId(id);
    setError("");
    try {
      await api.patch(`/restock-requests/${id}/reject`);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function handleFulfill(id: string) {
    if (!confirm("Fulfill request ini? Sistem akan otomatis membuat Transfer Stok.")) return;
    setBusyId(id);
    setError("");
    try {
      await api.patch(`/restock-requests/${id}/fulfill`);
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
          <h1 className="text-2xl font-bold">Restock Request</h1>
          <p className="text-sm text-ink/60">
            Otomatis dibuat sistem kalau stok turun sampai/di bawah minimum, atau ajukan manual.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)} className="!py-2 !px-4 text-sm">
          <Plus size={16} /> Ajukan Manual
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-3">
          <h2 className="font-semibold">Ajukan Restock Manual</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Produk *</label>
              <select
                value={form.variantId}
                onChange={(e) => setForm({ ...form, variantId: e.target.value })}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Pilih produk</option>
                {variantOptions.map((o) => (
                  <option key={o.variant.id} value={o.variant.id}>{variantLabel(o)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Jumlah *</label>
              <Input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Lokasi Sumber</label>
              <select
                value={form.sourceHubId}
                onChange={(e) => setForm({ ...form, sourceHubId: e.target.value })}
                className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Belum tahu, tentukan nanti saat approve</option>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Catatan</label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Opsional" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="!py-2 !px-4 text-sm">
              {saving ? "Menyimpan..." : "Ajukan"}
            </Button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-accent">
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              tab === t.value ? "bg-primary text-white" : "bg-accent text-ink/70 hover:bg-primary-light"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && !showForm && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!requests && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {requests && requests.length === 0 && (
        <EmptyState icon="📦" title="Belum ada Restock Request" description="Restock Request otomatis muncul kalau stok menipis." />
      )}

      {requests && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((r) => {
            const canManageSource = isPusat || r.sourceHubId === user?.managedPointId;
            return (
              <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {r.requestNumber} {r.isAuto && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs font-normal text-ink/50">Otomatis</span>}
                  </p>
                  <p className="text-sm text-ink/60">
                    {r.variant?.product?.name || r.variantId}
                    {r.variant?.name && r.variant.name !== "Default" && <> ({r.variant.name})</>} · {r.qty} unit
                  </p>
                  <p className="text-xs text-ink/40">
                    Peminta: {r.point?.name || "-"} · Sumber: {r.sourceHub?.name || "belum ditentukan"}
                  </p>
                  {r.note && <p className="text-xs text-ink/40">Catatan: {r.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={r.status}>{r.status}</Badge>
                  {r.status === "PENDING" && canManageSource && (
                    <>
                      <button
                        onClick={() => handleApprove(r)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium hover:bg-primary-light hover:text-primary disabled:opacity-50"
                      >
                        <PackageCheck size={13} /> Setujui
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle size={13} /> Tolak
                      </button>
                    </>
                  )}
                  {r.status === "APPROVED" && canManageSource && (
                    <button
                      onClick={() => handleFulfill(r.id)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Truck size={13} /> Fulfill (Kirim)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RestockRequestsPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "ADMIN_POINT"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <RestockRequestsContent />
      </div>
    </RoleGuard>
  );
}
