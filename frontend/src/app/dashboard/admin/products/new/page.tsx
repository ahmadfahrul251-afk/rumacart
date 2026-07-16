"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Category } from "@/types";

function NewProductContent() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [variantName, setVariantName] = useState("Default");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [weightGram, setWeightGram] = useState(0);
  const [lengthCm, setLengthCm] = useState<number | "">("");
  const [widthCm, setWidthCm] = useState<number | "">("");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [minStock, setMinStock] = useState(5);

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const { url } = await api.upload<{ url: string }>("/upload/image", file);
      setImage(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name || !sku || !categoryId) {
      setError("Nama, SKU, dan Kategori wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const product = await api.post<{ slug: string }>("/products", {
        name,
        categoryId,
        variantName: variantName || "Default",
        sku,
        barcode: barcode || undefined,
        weightGram,
        lengthCm: lengthCm === "" ? undefined : lengthCm,
        widthCm: widthCm === "" ? undefined : widthCm,
        heightCm: heightCm === "" ? undefined : heightCm,
        searchKeywords: searchKeywords || undefined,
        minStock,
        images: image ? [image] : [],
      });
      router.push(`/dashboard/admin/products/${product.slug}`);
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
      <h1 className="mb-6 text-2xl font-bold">Tambah Produk</h1>
      <p className="mb-6 max-w-2xl text-sm text-ink/50">
        Produk baru masuk ke katalog pusat sekalian dengan 1 varian pertamanya (tanpa harga). Tiap
        RDH/Mart/Point yang mau menjualnya perlu "klaim" varian ini dulu di halaman Produk mereka
        masing-masing — harga dasar (RDH) atau harga jual (Mart/Point) diatur saat klaim. Kalau produk ini
        nanti punya varian rasa/ukuran lain, tambahkan lewat "Kelola Varian" di halaman edit produk.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        <div className="card">
          <p className="mb-3 font-semibold">Foto Produk</p>
          <div className="mb-3 grid aspect-square place-items-center overflow-hidden rounded-xl bg-accent text-4xl">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={name} className="h-full w-full object-cover" />
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
            id="new-product-image-input"
          />
          <label
            htmlFor="new-product-image-input"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 py-2.5 text-sm font-medium text-ink/70 hover:bg-accent"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Mengupload..." : "Upload Foto"}
          </label>
          <p className="mt-2 text-xs text-ink/40">JPG/PNG/WEBP, maksimal 5MB. Opsional.</p>
        </div>

        <div className="card space-y-3 md:col-span-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nama Produk *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Beras Premium 5kg" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Kategori *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="rounded-xl border border-dashed border-black/15 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Varian Pertama</p>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium">Nama Varian</label>
              <Input
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder='Contoh: "Original", "85g" — kosongkan kalau produk ini tidak punya varian rasa/ukuran lain'
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">SKU *</label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Contoh: BRS-5KG-001" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Barcode</label>
                <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Opsional, untuk scan Kasir" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Berat (gram)</label>
              <Input type="number" min={0} value={weightGram} onChange={(e) => setWeightGram(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Stok Minimum</label>
              <Input type="number" min={0} value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Panjang (cm)</label>
              <Input type="number" min={0} value={lengthCm} onChange={(e) => setLengthCm(e.target.value ? Number(e.target.value) : "")} placeholder="Opsional" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Lebar (cm)</label>
              <Input type="number" min={0} value={widthCm} onChange={(e) => setWidthCm(e.target.value ? Number(e.target.value) : "")} placeholder="Opsional" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tinggi (cm)</label>
              <Input type="number" min={0} value={heightCm} onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : "")} placeholder="Opsional" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Kata Kunci Pencarian</label>
            <Input
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              placeholder="Pisahkan koma, contoh: mie instan, pedas, rendang"
            />
            <p className="mt-1 text-xs text-ink/40">Membantu customer menemukan produk ini lewat pencarian.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Menyimpan..." : "Simpan Produk"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewProductPage() {
  const { user } = useAuth();
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role={user?.role || "ADMIN"} />
        <NewProductContent />
      </div>
    </RoleGuard>
  );
}
