import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

// GET /api/products?search=&category=&page=&limit=&sort=
// Query publik untuk katalog customer — hanya produk aktif. Harga TIDAK lagi
// ada di Product, jadi tiap item dilengkapi priceMin/priceMax (rentang harga
// dari semua Mart/Point yang sudah klaim & atur harga jual produk ini).
// Catatan: sort price_asc/price_desc disortir di JS (bukan query DB) karena
// harga sekarang tersebar di Inventory (per lokasi), bukan 1 kolom di Product.
const SORT_OPTIONS: Record<string, any> = {
  newest: { createdAt: "desc" },
  name_asc: { name: "asc" },
};

export async function listProducts(req: Request, res: Response) {
  const { search = "", category, page = "1", limit = "20", sort = "newest" } = req.query as Record<string, string>;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Number(page) - 1) * take;
  const isPriceSort = sort === "price_asc" || sort === "price_desc";

  const where: any = {
    isActive: true,
    OR: search
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
          { searchKeywords: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };
  if (category) where.category = { slug: category };

  if (!isPriceSort) {
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, inventory: true },
        skip,
        take,
        orderBy: SORT_OPTIONS[sort] || SORT_OPTIONS.newest,
      }),
      prisma.product.count({ where }),
    ]);
    const data = items.map((p: any) => withStockSummary(p));
    return ok(res, { items: data, total, page: Number(page), totalPages: Math.ceil(total / take) });
  }

  // Sort harga: ambil semua yang cocok filter, hitung rentang harga, urutkan
  // di JS, baru dipotong per halaman. Skala data produk masih kecil jadi aman.
  const all = await prisma.product.findMany({
    where,
    include: { category: true, inventory: true },
    orderBy: { createdAt: "desc" },
  });
  const withPrice = all.map((p: any) => withStockSummary(p));
  withPrice.sort((a: any, b: any) => {
    const pa = a.priceMin ?? Infinity;
    const pb = b.priceMin ?? Infinity;
    return sort === "price_asc" ? pa - pb : pb - pa;
  });
  const total = withPrice.length;
  const data = withPrice.slice(skip, skip + take);
  return ok(res, { items: data, total, page: Number(page), totalPages: Math.ceil(total / take) });
}

// GET /api/products/barcode/:code?pointId=
// Exact match, dipakai POS Kasir saat scan barcode. Kalau pointId dikirim,
// sertakan harga & stok spesifik lokasi itu (currentPoint) — dipakai Kasir
// supaya harga yang dipakai jual selalu harga lokasi Kasir sendiri.
export async function getProductByBarcode(req: Request, res: Response) {
  const { code } = req.params;
  const { pointId } = req.query as Record<string, string>;
  const product = await prisma.product.findFirst({
    where: { barcode: code, isActive: true },
    include: { category: true, inventory: true },
  });
  if (!product) return fail(res, "Produk dengan barcode ini tidak ditemukan", 404);
  return ok(res, withStockSummary(product, pointId));
}

export async function getProductBySlug(req: Request, res: Response) {
  const { slug } = req.params;
  const { pointId } = req.query as Record<string, string>;
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
    ...withStockSummary(product, pointId),
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
      lengthCm: body.lengthCm ? Number(body.lengthCm) : null,
      widthCm: body.widthCm ? Number(body.widthCm) : null,
      heightCm: body.heightCm ? Number(body.heightCm) : null,
      searchKeywords: body.searchKeywords || null,
      minStock: Number(body.minStock) || 5,
      images: body.images || [],
    },
  });
  return ok(res, product, "Produk dibuat", 201);
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body;
  // Whitelist field yang boleh diubah dari sini — harga TIDAK di sini lagi
  // (harga diatur per lokasi lewat endpoint klaim/atur harga di inventory).
  const data: any = {};
  for (const field of [
    "name", "slug", "description", "categoryId", "brand", "sku", "barcode",
    "weightGram", "lengthCm", "widthCm", "heightCm", "searchKeywords",
    "minStock", "images", "isActive",
  ]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  const product = await prisma.product.update({ where: { id }, data });
  return ok(res, product, "Produk diperbarui");
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  return ok(res, null, "Produk dihapus");
}

// Hitung ringkasan stok + rentang harga dari semua baris Inventory (lintas
// lokasi). priceMin/priceMax cuma dihitung dari lokasi yang sudah punya
// sellPrice (Mart/Point yang sudah "Atur Harga") — RDH tidak dihitung karena
// RDH cuma punya basePrice, tidak jual langsung ke customer.
function withStockSummary(product: any, pointId?: string) {
  const inventory = product.inventory || [];
  const totalStock = inventory.reduce((sum: number, inv: any) => sum + inv.stock, 0);

  const priced = inventory.filter((inv: any) => inv.sellPrice != null);
  const effectivePrices = priced.map((inv: any) => inv.discountPrice ?? inv.sellPrice);
  const priceMin = effectivePrices.length ? Math.min(...effectivePrices) : null;
  const priceMax = effectivePrices.length ? Math.max(...effectivePrices) : null;

  let currentPoint: any = null;
  if (pointId) {
    const inv = inventory.find((i: any) => i.pointId === pointId);
    if (inv) {
      currentPoint = {
        pointId: inv.pointId,
        stock: inv.stock,
        basePrice: inv.basePrice,
        sellPrice: inv.sellPrice,
        discountPrice: inv.discountPrice,
      };
    }
  }

  return { ...product, totalStock, priceMin, priceMax, currentPoint };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
