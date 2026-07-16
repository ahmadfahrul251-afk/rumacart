"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Upload, Loader2, Pencil, Plus, Power } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Product, ProductVariant } from "@/types";

type VariantForm = {
  name: string;
  sku: string;
  barcode: string;
  weightGram: number;
  lengthCm: number | "";
  widthCm: number | "";
  heightCm: number | "";
  minStock: number;
};

const EMPTY_VARIANT_FORM: VariantForm = {
  name: "",
  sku: "",
  barcode: "",
  weightGram: 0,
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  minStock: 5,
};

function variantToForm(v: ProductVariant): VariantForm {
  return {
    name: v.name,
    sku: v.sku,
    barcode: v.barcode || "",
    weightGram: v.weightGram,
    lengthCm: v.lengthCm ?? "",
    widthCm: v.widthCm ?? "",
    heightCm: v.heightCm ?? "",
    minStock: v.minStock,
  };
}

function VariantFormFields({ form, onChange }: { form: VariantForm; onChange: (f: VariantForm) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Nama Varian *</label>
          <Input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder='Contoh: "Pedas", "85g"' />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">SKU *</label>
          <Input value={form.sku} onChange={(e) => onChange({ ...form, sku: e.target.value })} placeholder="Contoh: CHT-PEDAS-85" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Barcode</label>
          <Input value={form.barcode} onChange={(e) => onChange({ ...form, barcode: e.target.value })} placeholder="Opsional, untuk scan Kasir" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Berat (gram)</label>
          <Input type="number" min={0} value={form.weightGram} onChange={(e) => onChange({ ...form, weightGram: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Panjang (cm)</label>
          <Input type="number" min={0} value={form.lengthCm} onChange={(e) => onChange({ ...form, lengthCm: e.target.value ? Number(e.target.value) : "" })} placeholder="Opsional" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Lebar (cm)</label>
          <Input type="number" min={0} value={form.widthCm} onChange={(e) => onChange({ ...form, widthCm: e.target.value ? Number(e.target.value) : "" })} placeholder="Opsional" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Tinggi (cm)</label>
          <Input type="number" min={0} value={form.heightCm} onChange={(e) => onChange({ ...form, heightCm: e.target.value ? Number(e.target.value) : "" })} placeholder="Opsional" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Stok Minimum</label>
        <Input type="number" min={0} value={form.minStock} onChange={(e) => onChange({ ...form, minStock: Number(e.target.value) })} />
      </div>
    </div>
  );
}

function EditProductContent() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Kelola Varian
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(EMPTY_VARIANT_FORM);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [variantError, setVariantError] = useState("");
  const [variantSaving, setVariantSaving] = useState(false);

  function loadProduct() {
    api.get<Product>(`/products/${slug}`).then(setProduct).catch(() => setProduct(null));
  }

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !product) return;

    setError("");
    setUploading(true);
    try {
      // 1. Upload file gambar ke Cloudinary lewat backend, dapatkan URL-nya.
      const { url } = await api.upload<{ url: string }>("/upload/image", file);
      // 2. Simpan URL itu ke field `images` produk (di UI dulu; disimpan
      //    permanen saat tombol "Simpan Perubahan" di bawah diklik).
      setProduct({ ...product, images: [url] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    if (!product) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`/products/${product.id}`, {
        name: product.name,
        description: product.description,
        searchKeywords: product.searchKeywords || null,
        images: product.images,
      });
      setSuccess("Perubahan tersimpan.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEditVariant(v: ProductVariant) {
    setShowAddVariant(false);
    setEditingVariantId(v.id);
    setVariantForm(variantToForm(v));
    setVariantError("");
  }

  function startAddVariant() {
    setEditingVariantId(null);
    setVariantForm(EMPTY_VARIANT_FORM);
    setVariantError("");
    setShowAddVariant(true);
  }

  function cancelVariantForm() {
    setEditingVariantId(null);
    setShowAddVariant(false);
    setVariantError("");
  }

  function variantPayload() {
    return {
      name: variantForm.name,
      sku: variantForm.sku,
      barcode: variantForm.barcode || null,
      weightGram: variantForm.weightGram,
      lengthCm: variantForm.lengthCm === "" ? null : variantForm.lengthCm,
      widthCm: variantForm.widthCm === "" ? null : variantForm.widthCm,
      heightCm: variantForm.heightCm === "" ? null : variantForm.heightCm,
      minStock: variantForm.minStock,
    };
  }

  async function saveVariant() {
    if (!product) return;
    if (!variantForm.name || !variantForm.sku) {
      setVariantError("Nama varian dan SKU wajib diisi");
      return;
    }
    setVariantSaving(true);
    setVariantError("");
    try {
      if (editingVariantId) {
        await api.put(`/variants/${editingVariantId}`, variantPayload());
      } else {
        await api.post(`/products/${product.id}/variants`, variantPayload());
      }
      cancelVariantForm();
      loadProduct();
    } catch (err: any) {
      setVariantError(err.message);
    } finally {
      setVariantSaving(false);
    }
  }

  async function toggleVariantActive(v: ProductVariant) {
    try {
      if (v.isActive) {
        await api.delete(`/variants/${v.id}`);
      } else {
        await api.put(`/variants/${v.id}`, { isActive: true });
      }
      loadProduct();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!product) {
    return <div className="flex-1 p-6 text-sm text-ink/50">Memuat produk...</div>;
  }

  return (
    <div className="flex-1 p-6">
      <button onClick={() => router.back()} className="mb-4 text-sm text-ink/60 hover:text-ink">
        ← Kembali
      </button>
      <h1 className="mb-6 text-2xl font-bold">Edit Produk</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card">
          <p className="mb-3 font-semibold">Foto Produk</p>
          <div className="mb-3 grid aspect-square place-items-center overflow-hidden rounded-xl bg-accent text-4xl">
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              "🛒"
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="product-image-input"
          />
          <label
            htmlFor="product-image-input"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 py-2.5 text-sm font-medium text-ink/70 hover:bg-accent"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Mengupload..." : "Upload Foto Baru"}
          </label>
          <p className="mt-2 text-xs text-ink/40">JPG/PNG/WEBP, maksimal 5MB.</p>
        </div>

        <div className="card space-y-3 md:col-span-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nama Produk</label>
            <Input value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Deskripsi</label>
            <textarea
              value={product.description || ""}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Kata Kunci Pencarian</label>
            <Input
              value={product.searchKeywords ?? ""}
              onChange={(e) => setProduct({ ...product, searchKeywords: e.target.value || null })}
              placeholder="Pisahkan koma, contoh: mie instan, pedas, rendang"
            />
          </div>
          <p className="text-xs text-ink/40">
            SKU, barcode, dimensi, dan harga sekarang diatur per varian (lihat "Kelola Varian" di bawah) —
            harga jual/harga dasar sendiri tetap diatur per lokasi lewat halaman "Produk" di dashboard
            tiap lokasi.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-primary">{success}</p>}

          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>

      <div className="card mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">Kelola Varian</p>
            <p className="text-xs text-ink/40">
              Tiap varian punya SKU, barcode, dimensi, stok, dan harga sendiri per lokasi. Pakai ini untuk
              produk dengan rasa/ukuran berbeda (contoh: Chitato Sapi Panggang vs Chitato Balado).
            </p>
          </div>
          <Button variant="secondary" onClick={startAddVariant}>
            <Plus size={16} className="mr-1 inline" /> Tambah Varian
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-ink/40">
                <th className="py-2 pr-3">Nama Varian</th>
                <th className="py-2 pr-3">SKU</th>
                <th className="py-2 pr-3">Barcode</th>
                <th className="py-2 pr-3">Berat</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(product.variants || []).map((v) => (
                <tr key={v.id} className="border-b border-black/5">
                  <td className="py-2 pr-3 font-medium">{v.name}</td>
                  <td className="py-2 pr-3 text-ink/60">{v.sku}</td>
                  <td className="py-2 pr-3 text-ink/60">{v.barcode || "-"}</td>
                  <td className="py-2 pr-3 text-ink/60">{v.weightGram}g</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${v.isActive ? "bg-primary/10 text-primary" : "bg-black/5 text-ink/40"}`}>
                      {v.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEditVariant(v)} className="rounded-lg p-1.5 text-ink/50 hover:bg-accent hover:text-ink" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => toggleVariantActive(v)} className="rounded-lg p-1.5 text-ink/50 hover:bg-accent hover:text-ink" title={v.isActive ? "Nonaktifkan" : "Aktifkan"}>
                        <Power size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!product.variants || product.variants.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-ink/40">Belum ada varian.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {(showAddVariant || editingVariantId) && (
          <div className="mt-4 rounded-xl border border-dashed border-black/15 p-4">
            <p className="mb-3 font-semibold">{editingVariantId ? "Edit Varian" : "Varian Baru"}</p>
            <VariantFormFields form={variantForm} onChange={setVariantForm} />
            {variantError && <p className="mt-2 text-sm text-red-600">{variantError}</p>}
            <div className="mt-3 flex gap-2">
              <Button onClick={saveVariant} disabled={variantSaving}>
                {variantSaving ? "Menyimpan..." : "Simpan Varian"}
              </Button>
              <Button variant="secondary" onClick={cancelVariantForm}>Batal</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditProductPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <EditProductContent />
      </div>
    </RoleGuard>
  );
}
