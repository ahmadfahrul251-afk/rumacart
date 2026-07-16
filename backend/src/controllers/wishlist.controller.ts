import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { withVariantSummary, combineProductSummary } from "./product.controller";

// GET /api/wishlist — daftar produk yang di-wishlist user yang sedang login.
// Round 18: stok/harga sekarang ada di ProductVariant, jadi ringkasannya
// dihitung lewat helper yang sama dipakai listProducts, biar ProductCard
// dapat bentuk data yang konsisten (variants[] + priceMin/priceMax/totalStock).
export async function listWishlist(req: Request, res: Response) {
  const items = await prisma.wishlist.findMany({
    where: { userId: req.user!.userId },
    include: {
      product: {
        include: { category: true, variants: { where: { isActive: true }, include: { inventory: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = items.map((item: any) => {
    const variants = (item.product.variants || []).map((v: any) => withVariantSummary(v));
    return { ...combineProductSummary(item.product, variants), wishlistId: item.id };
  });

  return ok(res, products);
}

// POST /api/wishlist  { productId }
export async function addToWishlist(req: Request, res: Response) {
  const { productId } = req.body;
  if (!productId) return fail(res, "productId wajib diisi", 422);

  // upsert supaya aman kalau user klik tombol wishlist dua kali (tidak error duplikat)
  const item = await prisma.wishlist.upsert({
    where: { userId_productId: { userId: req.user!.userId, productId } },
    update: {},
    create: { userId: req.user!.userId, productId },
  });
  return ok(res, item, "Ditambahkan ke wishlist", 201);
}

// DELETE /api/wishlist/:productId
export async function removeFromWishlist(req: Request, res: Response) {
  const { productId } = req.params;
  await prisma.wishlist.deleteMany({
    where: { userId: req.user!.userId, productId },
  });
  return ok(res, null, "Dihapus dari wishlist");
}

// GET /api/wishlist/check/:productId — dipakai frontend untuk tahu apakah
// suatu produk sudah ada di wishlist user (menentukan status ikon ❤️)
export async function checkWishlist(req: Request, res: Response) {
  const { productId } = req.params;
  const item = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: req.user!.userId, productId } },
  });
  return ok(res, { wishlisted: !!item });
}
