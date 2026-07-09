"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Product } from "@/types";
import { formatRupiah } from "@/lib/utils";

function EditProductContent() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.get<Product>(`/products/${slug}`).then(setProduct).catch(() => setProduct(null));
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
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
        discountPrice: product.discountPrice || null,
        images: product.images,
      });
      setSuccess("Perubahan tersimpan.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Harga Modal (Dasar)</label>
              <Input
                type="number"
                value={product.costPrice}
                onChange={(e) => setProduct({ ...product, costPrice: Number(e.target.value) })}
              />
              <p className="mt-1 text-xs text-ink/40">Tidak terlihat customer. Dipakai untuk hitung untung & jaga cash bisnis.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Harga Jual</label>
              <Input
                type="number"
                value={product.sellPrice}
                onChange={(e) => setProduct({ ...product, sellPrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Harga Diskon (opsional)</label>
              <Input
                type="number"
                value={product.discountPrice ?? ""}
                onChange={(e) =>
                  setProduct({ ...product, discountPrice: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
          </div>

          {(() => {
            const effectivePrice = product.discountPrice || product.sellPrice;
            const margin = effectivePrice - product.costPrice;
            if (!product.costPrice) return null;
            return (
              <p className={`text-sm font-medium ${margin < 0 ? "text-red-600" : "text-primary"}`}>
                {margin < 0
                  ? `⚠️ Harga jual saat ini di bawah modal (rugi ${formatRupiah(Math.abs(margin))} per item)`
                  : `Estimasi untung per item: ${formatRupiah(margin)}`}
              </p>
            );
          })()}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-primary">{success}</p>}

          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EditProductPage() {
  return (
    <RoleGuard allow={["ADMIN", "SUPER_ADMIN", "GUDANG"]}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar role="ADMIN" />
        <EditProductContent />
      </div>
    </RoleGuard>
  );
}
