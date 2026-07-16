"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Heart, Share2, MapPin, ShoppingCart, BookmarkPlus, Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/product/StarRating";
import { ReviewSection } from "@/components/product/ReviewSection";
import { PointPickerModal } from "@/components/product/PointPickerModal";
import { api } from "@/lib/api";
import { Product, ProductVariant } from "@/types";
import { formatRupiah, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { usePlannedCart } from "@/lib/planned-cart-context";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { addItem: addPlanned } = usePlannedCart();
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [savedPlanned, setSavedPlanned] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    api.get<Product>(`/products/${slug}`).then((p) => {
      setProduct(p);
      // Pilih otomatis varian pertama yang masih ada stok (kalau ada), kalau
      // semua kosong, tetap pilih varian pertama biar UI tidak kosong.
      const firstInStock = p.variants?.find((v) => (v.totalStock ?? 0) > 0);
      setSelectedVariantId((firstInStock || p.variants?.[0])?.id || "");
    }).catch(() => setProduct(null));
  }, [slug]);

  const selectedVariant: ProductVariant | undefined = useMemo(
    () => product?.variants?.find((v) => v.id === selectedVariantId),
    [product, selectedVariantId]
  );

  if (!product) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Skeleton className="h-96 w-full" />
        </main>
        <Footer />
      </>
    );
  }

  const hasMultipleVariants = (product.variants?.length ?? 0) > 1;
  const displayName = (variant?: ProductVariant) =>
    !variant?.name || variant.name === "Default" ? product.name : `${product.name} (${variant.name})`;

  const priceMin = selectedVariant?.priceMin ?? null;
  const priceMax = selectedVariant?.priceMax ?? null;
  const isRange = priceMin != null && priceMax != null && priceMin !== priceMax;
  const totalStock = selectedVariant?.totalStock ?? 0;
  const variantLocations = (selectedVariant?.inventory || []).filter(
    (i: any) => i.stock > 0 && i.point?.type !== "RDH"
  );

  function handleSaveToPlanned() {
    if (!product || !selectedVariant) return;
    addPlanned({
      variantId: selectedVariant.id,
      name: displayName(selectedVariant),
      price: selectedVariant.priceMin ?? 0,
      image: selectedVariant.image || product.images?.[0],
      qty,
    });
    setSavedPlanned(true);
    setTimeout(() => setSavedPlanned(false), 1500);
  }

  function handleWishlistClick() {
    if (!user) {
      router.push("/login");
      return;
    }
    toggle(product!.id);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-accent grid place-items-center text-6xl">
            {(selectedVariant?.image || product.images?.[0]) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedVariant?.image || product.images?.[0]}
                alt={product.name}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              "🛒"
            )}
          </div>

          <div>
            {product.category && <Badge>{product.category.name}</Badge>}
            <h1 className="mt-3 text-2xl font-bold">{product.name}</h1>

            {(product.totalReviews ?? 0) > 0 && (
              <div className="mt-1 flex items-center gap-2 text-sm text-ink/60">
                <StarRating value={product.avgRating ?? 0} />
                <span>{product.avgRating} ({product.totalReviews} review)</span>
              </div>
            )}

            {hasMultipleVariants && (
              <div className="mt-4">
                <p className="mb-1.5 text-sm font-medium">Pilih Varian:</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants!.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariantId(v.id);
                        setQty(1);
                      }}
                      disabled={(v.totalStock ?? 0) <= 0}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                        v.id === selectedVariantId
                          ? "border-primary bg-primary-light font-medium text-primary"
                          : "border-black/10 hover:bg-accent"
                      )}
                    >
                      {v.name}
                      {(v.totalStock ?? 0) <= 0 && " (Habis)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex items-baseline gap-3">
              {priceMin == null ? (
                <span className="text-sm text-ink/40">Harga belum tersedia</span>
              ) : isRange ? (
                <span className="text-2xl font-bold text-primary">
                  {formatRupiah(priceMin)} – {formatRupiah(priceMax!)}
                </span>
              ) : (
                <span className="text-2xl font-bold text-primary">{formatRupiah(priceMin)}</span>
              )}
            </div>

            {selectedVariant && (
              <p className="mt-2 text-sm text-ink/60">
                Stok tersedia: <span className="font-medium text-ink">{totalStock}</span> · SKU: {selectedVariant.sku} · Berat: {selectedVariant.weightGram}g
                {(selectedVariant.lengthCm || selectedVariant.widthCm || selectedVariant.heightCm) && (
                  <> · Dimensi: {selectedVariant.lengthCm ?? "-"}×{selectedVariant.widthCm ?? "-"}×{selectedVariant.heightCm ?? "-"} cm</>
                )}
              </p>
            )}

            <p className="mt-4 text-sm leading-relaxed text-ink/70">{product.description}</p>

            <div className="mt-4 space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium"><MapPin size={14} /> Tersedia di Point:</p>
              <div className="flex flex-wrap gap-2">
                {variantLocations.map((i: any, idx: number) => {
                  const p = i.discountPrice ?? i.sellPrice;
                  return (
                    <span key={idx} className="rounded-full bg-accent px-3 py-1 text-xs">
                      {i.point.name} ({i.stock}){p != null && <> · {formatRupiah(p)}</>}
                    </span>
                  );
                })}
                {totalStock === 0 && <span className="text-xs text-red-600">Stok habis di semua Point</span>}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-black/10">
                <button className="px-3 py-2" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span className="w-8 text-center text-sm">{qty}</span>
                <button className="px-3 py-2" onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <button
                onClick={() => setShowPicker(true)}
                disabled={totalStock === 0 || !selectedVariant}
                className="btn-primary flex-1 disabled:opacity-40"
              >
                <ShoppingCart size={18} /> Beli Sekarang
              </button>
              <button
                onClick={handleSaveToPlanned}
                title="Simpan ke Rencana Belanja"
                disabled={!selectedVariant}
                className="rounded-xl border border-black/10 p-2.5 hover:bg-accent disabled:opacity-40"
              >
                {savedPlanned ? <Check size={18} className="text-primary" /> : <BookmarkPlus size={18} />}
              </button>
              <button
                onClick={handleWishlistClick}
                className="rounded-xl border border-black/10 p-2.5 hover:bg-accent"
                aria-label="Simpan ke wishlist"
              >
                <Heart
                  size={18}
                  className={cn(isWishlisted(product.id) ? "fill-secondary text-secondary" : undefined)}
                />
              </button>
              <button className="rounded-xl border border-black/10 p-2.5 hover:bg-accent"><Share2 size={18} /></button>
            </div>
          </div>
        </div>

        <ReviewSection productId={product.id} />
      </main>
      <Footer />

      {showPicker && product && selectedVariant && (
        <PointPickerModal
          variantId={selectedVariant.id}
          productName={displayName(selectedVariant)}
          qty={qty}
          onClose={() => setShowPicker(false)}
          onConfirm={(point) => {
            addItem({
              variantId: selectedVariant.id,
              name: displayName(selectedVariant),
              price: point.price ?? selectedVariant.priceMin ?? 0,
              image: selectedVariant.image || product.images?.[0],
              qty,
              pointId: point.pointId,
              pointName: point.name,
              pointCode: point.code,
            });
            setShowPicker(false);
          }}
        />
      )}
    </>
  );
}
