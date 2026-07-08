import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

// GET /api/products?search=&category=&page=&limit=
// Query publik untuk katalog customer — hanya produk aktif, plus total stok
// gabungan dari semua Point supaya bisa ditampilkan "Stok tersedia".
export async function listProducts(req: Request, res: Response) {
  const { search = "", category, page = "1", limit = "20" } = req.query as Record<string, string>;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Number(page) - 1) * take;

  const where: any = {
    isActive: true,
    name: { contains: search, mode: "insensitive" },
  };
  if (category) where.category = { slug: category };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, inventory: true },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  const data = items.map(withStockSummary);
  return ok(res, { items: data, total, page: Number(page), totalPages: Math.ceil(total / take) });
}

export async function getProductBySlug(req: Request, res: Response) {
  const { slug } = req.params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true, inventory: { include: { point: true } } },
  });
  if (!product) return fail(res, "Produk tidak ditemukan", 404);

  // Ringkasan rating (dipakai untuk tampilkan bintang di halaman detail).
  // Daftar review lengkapnya diambil terpisah lewat GET /api/reviews?productId=.
  const ratingAgg = await prisma.review.aggregate({
    where: { productId: product.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return ok(res, {
    ...withStockSummary(product),
    avgRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : 0,
    totalReviews: ratingAgg._count.rating,
  });
}

export async function createProduct(req: Request, res: Response) {
  const body = req.body;
  if (!body.name || !body.sku || !body.categoryId) {
    return fail(res, "name, sku, dan categoryId wajib diisi", 422);
  }
  const slug = body.slug || slugify(body.name);
  const product = await prisma.product.create({
    data: {
      name: body.name,
      slug,
      description: body.description,
      categoryId: body.categoryId,
      brand: body.brand,
      sku: body.sku,
      barcode: body.barcode,
      weightGram: Number(body.weightGram) || 0,
      costPrice: Number(body.costPrice) || 0,
      sellPrice: Number(body.sellPrice) || 0,
      discountPrice: body.discountPrice ? Number(body.discountPrice) : null,
      minStock: Number(body.minStock) || 5,
      images: body.images || [],
    },
  });
  return ok(res, product, "Produk dibuat", 201);
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const product = await prisma.product.update({ where: { id }, data: req.body });
  return ok(res, product, "Produk diperbarui");
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  return ok(res, null, "Produk dihapus");
}

function withStockSummary(product: any) {
  const totalStock = (product.inventory || []).reduce((sum: number, inv: any) => sum + inv.stock, 0);
  return { ...product, totalStock };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
