import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

// GET /api/reviews?productId=xxx — publik, dipakai halaman detail produk
export async function listReviews(req: Request, res: Response) {
  const { productId } = req.query as Record<string, string>;
  if (!productId) return fail(res, "productId wajib diisi", 422);

  const reviews = await prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length : 0;

  return ok(res, {
    reviews,
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews: reviews.length,
  });
}

// POST /api/reviews  { productId, rating, comment }
// Hanya customer yang order-nya (status COMPLETED) mengandung produk ini
// yang boleh kasih review — mencegah review palsu dari yang belum beli.
export async function createReview(req: Request, res: Response) {
  const { productId, rating, comment } = req.body;
  const userId = req.user!.userId;

  if (!productId || !rating) return fail(res, "productId dan rating wajib diisi", 422);
  if (rating < 1 || rating > 5) return fail(res, "Rating harus antara 1-5", 422);

  // Round 18: OrderItem sekarang nunjuk ke ProductVariant, bukan Product
  // langsung. Review tetap di level Product, jadi dicek lewat variant.productId.
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      variant: { productId },
      order: { customerId: userId, status: "COMPLETED" },
    },
  });
  if (!hasPurchased) {
    return fail(res, "Kamu hanya bisa memberi review untuk produk yang sudah selesai dibeli", 403);
  }

  // upsert: kalau user pernah review produk ini, perbarui reviewnya (bukan bikin baru)
  const review = await prisma.review.upsert({
    where: { userId_productId: { userId, productId } },
    update: { rating, comment },
    create: { userId, productId, rating, comment },
  });

  return ok(res, review, "Review disimpan", 201);
}
