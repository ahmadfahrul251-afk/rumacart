import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

// GET /api/products?search=&category=&page=&limit=&sort=
// Query publik untuk katalog customer — hanya produk aktif. Product sekarang
// cuma "induk" (nama, kategori, brand, keywords) — SKU/barcode/dimensi/harga/
// stok ada di ProductVariant & Inventory (Round 18: fitur Varian Produk).
// Tiap item balasan bawa `variants[]` (masing-masing sudah dilengkapi
// priceMin/priceMax/totalStock sendiri) plus priceMin/priceMax/totalStock
// GABUNGAN di level Product (dipakai kartu katalog sebelum customer pilih
// varian). Sort price_asc/price_desc tetap disortir di JS.
const SORT_OPTIONS: Record<string, any> = {
  newest: { createdAt: "desc" },
  name_asc: { name: "asc" },
};

const VARIANT_INCLUDE = {
  variants: { where: { isActive: true }, include: { inventory: true } },
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
        include: { category: true, ...VARIANT_INCLUDE },
        skip,
        take,
        orderBy: SORT_OPTIONS[sort] || SORT_OPTIONS.newest,
      }),
      prisma.product.count({ where }),
    ]);
    const data = items.map((p: any) => withProductSummary(p));
    return ok(res, { items: data, total, page: Number(page), totalPages: Math.ceil(total / take) });
  }

  // Sort harga: ambil semua yang cocok filter, hitung rentang harga (gabungan
  // semua varian x semua lokasi), urutkan di JS, baru dipotong per halaman.
  // Skala data produk masih kecil jadi aman.
  const all = await prisma.product.findMany({
    where,
    include: { category: true, ...VARIANT_INCLUDE },
    orderBy: { createdAt: "desc" },
  });
  const withPrice = all.map((p: any) => withProductSummary(p));
  withPrice.sort((a: any, b: any) => {
    const pa = a.priceMin ?? Infinity;
    const pb = b.priceMin ?? Infinity;
    return sort === "price_asc" ? pa - pb : pb - pa;
  });
  const total = withPrice.length;
  const data = withPrice.slice(skip, skip + take);
  return ok(res, { items: data, total, page: Number(page), totalPages: Math.ceil(total / take) });
}

export async function getProductBySlug(req: Request, res: Response) {
  const { slug } = req.params;
  const { pointId } = req.query as Record<string, string>;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { where: { isActive: true }, include: { inventory: { include: { point: true } } } },
    },
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
    ...withProductSummary(product, pointId),
    avgRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : 0,
    totalReviews: ratingAgg._count.rating,
  });
}

// POST /api/products  { name, categoryId, ..., sku, barcode?, weightGram?, ... }
// Sekalian bikin varian PERTAMA-nya dalam 1 request (biar alur "Tambah
// Produk" tetap 1 langkah kayak sebelum ada fitur Varian). Varian tambahan
// lain (rasa/ukuran lain) ditambah belakangan lewat "Kelola Varian" di
// halaman edit produk (lihat variant.controller.ts).
export async function createProduct(req: Request, res: Response) {
  const body = req.body;
  if (!body.name || !body.categoryId) {
    return fail(res, "name dan categoryId wajib diisi", 422);
  }
  if (!body.sku) {
    return fail(res, "SKU varian pertama wajib diisi", 422);
  }
  const slug = body.slug || slugify(body.name);

  const product = await prisma.$transaction(async (tx: any) => {
    const p = await tx.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        categoryId: body.categoryId,
        brand: body.brand,
        searchKeywords: body.searchKeywords || null,
        minStock: Number(body.minStock) || 5,
        images: body.images || [],
      },
    });
    await tx.productVariant.create({
      data: {
        productId: p.id,
        name: body.variantName || "Default",
        sku: body.sku,
        barcode: body.barcode || null,
        weightGram: Number(body.weightGram) || 0,
        lengthCm: body.lengthCm ? Number(body.lengthCm) : null,
        widthCm: body.widthCm ? Number(body.widthCm) : null,
        heightCm: body.heightCm ? Number(body.heightCm) : null,
        minStock: Number(body.minStock) || 5,
      },
    });
    return p;
  });

  return ok(res, product, "Produk & varian pertama dibuat", 201);
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body;
  // Whitelist field level Product saja — SKU/barcode/dimensi/harga ada di
  // ProductVariant, diubah lewat endpoint varian (variant.controller.ts).
  const data: any = {};
  for (const field of [
    "name", "slug", "description", "categoryId", "brand", "searchKeywords",
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

// Hitung ringkasan 1 varian: total stok & rentang harga lintas lokasi (cuma
// dari lokasi yang sudah klaim & atur sellPrice — RDH tidak dihitung karena
// RDH cuma punya basePrice). `currentPoint` cuma terisi kalau request-nya
// point-scoped (?pointId=). Diekspor supaya dipakai juga oleh
// variant.controller.ts (barcode lookup, CRUD varian).
export function withVariantSummary(variant: any, pointId?: string) {
  const inventory = variant.inventory || [];
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

  return { ...variant, totalStock, priceMin, priceMax, currentPoint };
}

// Gabungkan ringkasan semua varian jadi 1 ringkasan level Product (dipakai
// kartu katalog sebelum customer pilih varian spesifik). Diekspor supaya
// dipakai juga oleh point.controller.ts (getPointProducts, point-scoped).
export function combineProductSummary(product: any, variants: any[]) {
  const totalStock = variants.reduce((sum: number, v: any) => sum + v.totalStock, 0);
  const mins = variants.map((v: any) => v.priceMin).filter((p: any): p is number => p != null);
  const maxs = variants.map((v: any) => v.priceMax).filter((p: any): p is number => p != null);
  const priceMin = mins.length ? Math.min(...mins) : null;
  const priceMax = maxs.length ? Math.max(...maxs) : null;
  return { ...product, variants, totalStock, priceMin, priceMax };
}

function withProductSummary(product: any, pointId?: string) {
  const variants = (product.variants || []).map((v: any) => withVariantSummary(v, pointId));
  return combineProductSummary(product, variants);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
