"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Address } from "@/types";

type AddressForm = {
  label: string;
  recipientName: string;
  phone: string;
  fullAddress: string;
  kecamatan: string;
  city: string;
  province: string;
  postalCode: string;
};

const EMPTY_FORM: AddressForm = {
  label: "Rumah",
  recipientName: "",
  phone: "",
  fullAddress: "",
  kecamatan: "",
  city: "",
  province: "",
  postalCode: "",
};

function addressToForm(a: Address): AddressForm {
  return {
    label: a.label,
    recipientName: a.recipientName,
    phone: a.phone,
    fullAddress: a.fullAddress,
    kecamatan: a.kecamatan || "",
    city: a.city,
    province: a.province,
    postalCode: a.postalCode || "",
  };
}

function AddressFormFields({ form, onChange }: { form: AddressForm; onChange: (f: AddressForm) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Label</label>
        <Input
          value={form.label}
          onChange={(e) => onChange({ ...form, label: e.target.value })}
          placeholder='Contoh: "Rumah", "Kos", "Kantor"'
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Nama Penerima *</label>
        <Input value={form.recipientName} onChange={(e) => onChange({ ...form, recipientName: e.target.value })} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">No. HP</label>
        <Input value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Alamat Lengkap *</label>
        <Input value={form.fullAddress} onChange={(e) => onChange({ ...form, fullAddress: e.target.value })} placeholder="Nama jalan, no rumah, RT/RW, patokan" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Kecamatan</label>
          <Input value={form.kecamatan} onChange={(e) => onChange({ ...form, kecamatan: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Kota *</label>
          <Input value={form.city} onChange={(e) => onChange({ ...form, city: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Provinsi</label>
          <Input value={form.province} onChange={(e) => onChange({ ...form, province: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Kode Pos</label>
          <Input value={form.postalCode} onChange={(e) => onChange({ ...form, postalCode: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

function AddressesContent() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddressForm>(EMPTY_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddressForm>(EMPTY_FORM);

  function load() {
    api.get<Address[]>("/addresses").then(setAddresses).catch(() => setAddresses([]));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!addForm.recipientName || !addForm.fullAddress || !addForm.city) {
      setError("Nama penerima, alamat lengkap, dan kota wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.post("/addresses", addForm);
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: Address) {
    setEditingId(a.id);
    setEditForm(addressToForm(a));
    setError("");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    if (!editForm.recipientName || !editForm.fullAddress || !editForm.city) {
      setError("Nama penerima, alamat lengkap, dan kota wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/addresses/${editingId}`, editForm);
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    await api.patch(`/addresses/${id}`, { isDefault: true });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus alamat ini?")) return;
    await api.delete(`/addresses/${id}`);
    load();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/profile" className="text-sm text-ink/60 hover:text-ink">Profil</Link>
        <span className="text-ink/30">/</span>
        <h1 className="text-2xl font-bold">Alamat Saya</h1>
      </div>

      {!addresses && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}

      {addresses?.length === 0 && !showAdd && (
        <EmptyState icon="📍" title="Belum ada alamat tersimpan" description="Tambah alamat supaya checkout lebih cepat." />
      )}

      <div className="space-y-3">
        {addresses?.map((a) =>
          editingId === a.id ? (
            <form key={a.id} onSubmit={handleSaveEdit} className="card space-y-3">
              <AddressFormFields form={editForm} onChange={setEditForm} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)} className="flex-1">
                  Batal
                </Button>
              </div>
            </form>
          ) : (
            <div key={a.id} className="card">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{a.label}</p>
                  {a.isDefault && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Star size={12} fill="currentColor" /> Utama
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(a)} className="rounded-lg p-1.5 text-ink/50 hover:bg-accent hover:text-ink" title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="rounded-lg p-1.5 text-ink/50 hover:bg-red-50 hover:text-red-600" title="Hapus">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium">{a.recipientName}{a.phone ? ` — ${a.phone}` : ""}</p>
              <p className="text-sm text-ink/60">
                {a.fullAddress}{a.kecamatan ? `, Kec. ${a.kecamatan}` : ""}, {a.city}
                {a.province ? `, ${a.province}` : ""}{a.postalCode ? ` ${a.postalCode}` : ""}
              </p>
              {!a.isDefault && (
                <button onClick={() => handleSetDefault(a.id)} className="mt-2 text-sm font-medium text-primary hover:underline">
                  Jadikan alamat utama
                </button>
              )}
            </div>
          )
        )}
      </div>

      {showAdd ? (
        <form onSubmit={handleAdd} className="card mt-4 space-y-3">
          <p className="font-semibold">Alamat Baru</p>
          <AddressFormFields form={addForm} onChange={setAddForm} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Menyimpan..." : "Simpan Alamat"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setError(""); }} className="flex-1">
              Batal
            </Button>
          </div>
        </form>
      ) : (
        addresses && (
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 py-3 text-sm font-medium text-ink/70 hover:bg-accent"
          >
            <Plus size={16} /> Tambah Alamat
          </button>
        )
      )}
    </main>
  );
}

export default function AddressesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <AddressesContent />
      <Footer />
    </>
  );
}
