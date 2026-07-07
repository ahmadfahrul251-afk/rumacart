"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Heart, Share2, MapPin, ShoppingCart } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";
import { Product } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { useCart } from "@/lib/cart-context";

interface ProductDetail extends Product {
  inventory: { stock: number; point: { name: string; city: string } }[];
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api.get<ProductDetail>(`/products/${slug}`).then(setProduct).catch(() => setProduct(null));
  }, [slug]);

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

  const price = product.discountPrice ?? product.sellPrice;
  const hasDiscount = !!product.discountPrice;
  const totalStock = product.inventory?.reduce((s, i) => s + i.stock, 0) ?? 0;

  function handleAddToCart() {
    addItem({ productId: product!.id, name: product!.name, price, image: product!.images?.[0], qty });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-accent grid place-items-center text-6xl">
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.name} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              "🛒"
            )}
          </div>

          <div>
            {product.category && <Badge>{product.category.name}</Badge>}
            <h1 className="mt-3 text-2xl font-bold">{product.name}</h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-primary">{formatRupiah(price)}</span>
              {hasDiscount && <span className="text-ink/40 line-through">{formatRupiah(product.sellPrice)}</span>}
            </div>

            <p className="mt-2 text-sm text-ink/60">
              Stok tersedia: <span className="font-medium text-ink">{totalStock}</span> · Berat: {product.weightGram}g
            </p>

            <p className="mt-4 text-sm leading-relaxed text-ink/70">{product.description}</p>

            <div className="mt-4 space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-medium"><MapPin size={14} /> Tersedia di Point:</p>
              <div className="flex flex-wrap gap-2">
                {product.inventory?.filter((i) => i.stock > 0).map((i, idx) => (
                  <span key={idx} className="rounded-full bg-accent px-3 py-1 text-xs">
                    {i.point.name} ({i.stock})
                  </span>
                ))}
                {totalStock === 0 && <span className="text-xs text-red-600">Stok habis di semua Point</span>}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-black/10">
                <button className="px-3 py-2" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span className="w-8 text-center text-sm">{qty}</span>
                <button className="px-3 py-2" onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <button onClick={handleAddToCart} disabled={totalStock === 0} className="btn-primary flex-1 disabled:opacity-40">
                <ShoppingCart size={18} /> {added ? "Ditambahkan!" : "Tambah Keranjang"}
              </button>
              <button className="rounded-xl border border-black/10 p-2.5 hover:bg-accent"><Heart size={18} /></button>
              <button className="rounded-xl border border-black/10 p-2.5 hover:bg-accent"><Share2 size={18} /></button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
