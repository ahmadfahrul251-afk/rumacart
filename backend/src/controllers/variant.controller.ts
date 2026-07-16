import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { withVariantSummary } from "./product.controller";

// Endpoint CRUD ProductVariant (Round 18: fitur Varian Produk). Varian
// PERTAMA sebuah produk dibuat sekalian lewat POST /api/products (lihat
// product.controller.ts) — endpoint di sini dipakai buat nambah varian
// LAIN (rasa/ukuran lain) ke produk yang sudah ada, lewat "Kelola Varian"
// di halaman edit produk (Admin Pusat saja).

// GET /api/products/:productId/variants
export async function listVariants(req: Request, res: Response) {
  const { productId } = req.params;
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    include: { inventory: true },
    orderBy: { createdAt: "asc" },
  });
  return ok(res, variants.map((v: any) => withVariantSummary(v)));
}

// POST /api/products/:productId/variants  { name, sku, barcode?, weightGram?, lengthCm?, widthCm?, heightCm?, minStock? }
export async function createVariant(req: Request, res: Response) {
  const { productId } = req.params;
  const body = req.body;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return fail(res, "Produk tidak ditemukan", 404);
  if (!body.name || !body.sku) return fail(res, "Nama varian dan SKU wajib diisi", 422);

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      name: body.name,
      sku: body.sku,
      barcode: body.barcode || null,
      weightGram: Number(body.weightGram) || 0,
      lengthCm: body.lengthCm ? Number(body.lengthCm) : null,
      widthCm: body.widthCm ? Number(body.widthCm) : null,
      heightCm: body.heightCm ? Number(body.heightCm) : null,
      minStock: body.minStock ? Number(body.minStock) : product.minStock,
    },
  });
  return ok(res, variant, "Varian dibuat", 201);
}

// PUT /api/variants/:id
export async function updateVariant(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body;
  const data: any = {};
  for (const field of [
    "name", "sku", "barcode", "weightGram", "lengthCm", "widthCm", "heightCm",
    "minStock", "image", "isActive",
  ]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  const variant = await prisma.productVariant.update({ where: { id }, data });
  return ok(res, variant, "Varian diperbarui");
}

// DELETE /api/variants/:id — soft delete (nonaktifkan, bukan hapus permanen,
// biar riwayat Inventory/OrderItem/dst yang mengacu ke variantId ini tetap utuh).
export async function deleteVariant(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.productVariant.update({ where: { id }, data: { isActive: false } });
  return ok(res, null, "Varian dinonaktifkan");
}

// GET /api/variants/barcode/:code?pointId=
// Exact match, dipakai POS Kasir saat scan barcode. Kalau pointId dikirim,
// sertakan harga & stok spesifik lokasi itu (currentPoint) — dipakai Kasir
// supaya harga yang dipakai jual selalu harga lokasi Kasir sendiri.
export async function getVariantByBarcode(req: Request, res: Response) {
  const { code } = req.params;
  const { pointId } = req.query as Record<string, string>;
  const variant = await prisma.productVariant.findFirst({
    where: { barcode: code, isActive: true },
    include: { product: { include: { category: true } }, inventory: true },
  });
  if (!variant) return fail(res, "Varian dengan barcode ini tidak ditemukan", 404);
  return ok(res, withVariantSummary(variant, pointId));
}
