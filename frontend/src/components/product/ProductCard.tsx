"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Heart, BookmarkPlus, Check } from "lucide-react";
import { Product } from "@/types";
import { formatRupiah, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { usePlannedCart } from "@/lib/planned-cart-context";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";
import { PointPickerModal } from "./PointPickerModal";

interface Props {
  product: Product;
  // Kalau diisi (dipanggil dari halaman detail Point, lihat app/points/[id]/page.tsx),
  // "Beli Sekarang" LANGSUNG masuk keranjang Point ini, tanpa buka PointPickerModal —
  // soalnya customer memang lagi browsing di dalam konteks Point tersebut.
  fixedPoint?: { pointId: string; name: string; code: string };
}

export function ProductCard({ product, fixedPoint }: Props) {
  const { addItem } = useCart();
  const { addItem: addPlanned } = usePlannedCart();
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const router = useRouter();
  const price = product.discountPrice ?? product.sellPrice;
  const hasDiscount = !!product.discountPrice && product.discountPrice < product.sellPrice;
  const outOfStock = (product.totalStock ?? 1) <= 0;
  const wishlisted = isWishlisted(product.id);
  const [showPicker, setShowPicker] = useState(false);
  const [savedPlanned, setSavedPlanned] = useState(false);

  function handleWishlistClick(e: React.MouseEvent) {
    e.preventDefault(); // jangan ikut navigasi ke halaman detail produk
    if (!user) {
      router.push("/login");
      return;
    }
    toggle(product.id);
  }

  function handleSaveToPlanned(e: React.MouseEvent) {
    e.preventDefault();
    addPlanned({ productId: product.id, name: product.name, price, image: product.images?.[0], qty: 1 });
    setSavedPlanned(true);
    setTimeout(() => setSavedPlanned(false), 1500);
  }

  return (
    <div className="card group flex flex-col overflow-hidden p-0 transition hover:shadow-soft">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative flex aspect-square items-center justify-center bg-accent text-3xl">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span>🛒</span>
          )}
          {hasDiscount && (
            <span className="absolute left-2 top-2 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-white">
              DISKON
            </span>
          )}
          <button
            onClick={handleWishlistClick}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 shadow-sm transition hover:scale-110"
            aria-label="Simpan ke wishlist"
          >
            <Heart size={14} className={cn(wishlisted ? "fill-secondary text-secondary" : "text-ink/40")} />
          </button>
          {outOfStock && (
            <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-semibold text-ink/70">
              Stok Habis
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={`/products/${product.slug}`}>
          <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium">{product.name}</p>
        </Link>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-primary">{formatRupiah(price)}</span>
          {hasDiscount && (
            <span className="text-xs text-ink/40 line-through">{formatRupiah(product.sellPrice)}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <button
            disabled={outOfStock}
            onClick={() => {
              if (fixedPoint) {
                addItem({
                  productId: product.id,
                  name: product.name,
                  price,
                  image: product.images?.[0],
                  qty: 1,
                  pointId: fixedPoint.pointId,
                  pointName: fixedPoint.name,
                  pointCode: fixedPoint.code,
                });
              } else {
                setShowPicker(true);
              }
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-light py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingCart size={14} /> Beli Sekarang
          </button>
          <button
            onClick={handleSaveToPlanned}
            title="Simpan ke Rencana Belanja"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-ink/60 transition hover:bg-primary-light hover:text-primary"
          >
            {savedPlanned ? <Check size={14} /> : <BookmarkPlus size={14} />}
          </button>
        </div>
      </div>

      {showPicker && (
        <PointPickerModal
          productId={product.id}
          productName={product.name}
          qty={1}
          onClose={() => setShowPicker(false)}
          onConfirm={(point) => {
            addItem({
              productId: product.id,
              name: product.name,
              price,
              image: product.images?.[0],
              qty: 1,
              pointId: point.pointId,
              pointName: point.name,
              pointCode: point.code,
            });
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}
