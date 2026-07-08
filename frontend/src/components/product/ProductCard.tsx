"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Heart } from "lucide-react";
import { Product } from "@/types";
import { formatRupiah, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useWishlist } from "@/lib/wishlist-context";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const router = useRouter();
  const price = product.discountPrice ?? product.sellPrice;
  const hasDiscount = !!product.discountPrice && product.discountPrice < product.sellPrice;
  const outOfStock = (product.totalStock ?? 1) <= 0;
  const wishlisted = isWishlisted(product.id);

  function handleWishlistClick(e: React.MouseEvent) {
    e.preventDefault(); // jangan ikut navigasi ke halaman detail produk
    if (!user) {
      router.push("/login");
      return;
    }
    toggle(product.id);
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
        <button
          disabled={outOfStock}
          onClick={() =>
            addItem({ productId: product.id, name: product.name, price, image: product.images?.[0], qty: 1 })
          }
          className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary-light py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingCart size={14} /> Tambah
        </button>
      </div>
    </div>
  );
}
