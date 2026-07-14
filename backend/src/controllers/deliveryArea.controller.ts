import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { resolveWritePointId, canAccessPoint } from "../utils/pointScope";
import { getDeliveryCost } from "../services/deliveryArea.service";

// GET /api/delivery-areas?pointId= — Admin Lokasi otomatis lihat area Point-nya
// sendiri. Admin Pusat wajib isi ?pointId= (atau kosongkan buat lihat semua
// area di semua Point sekaligus).
export async function listDeliveryAreas(req: Request, res: Response) {
  const pointId = req.user!.role === "ADMIN_POINT" ? req.user!.managedPointId : (req.query.pointId as string | undefined);
  const where: any = {};
  if (pointId) where.pointId = pointId;

  const areas = await prisma.deliveryArea.findMany({
    where,
    include: { point: { select: { id: true, name: true, code: true, city: true } } },
    orderBy: [{ city: "asc" }, { kecamatan: "asc" }],
  });
  return ok(res, areas);
}

// POST /api/delivery-areas  { pointId?, kecamatan, city, cost }
// Admin Lokasi: pointId otomatis dikunci ke lokasinya sendiri. Kalau kecamatan
// yang sama sudah pernah didaftarkan buat Point ini, biayanya di-update saja
// (bukan bikin baris duplikat).
export async function createDeliveryArea(req: Request, res: Response) {
  try {
    const pointId = resolveWritePointId(req, req.body.pointId);
    const { kecamatan, city, cost } = req.body;
    if (!pointId) return fail(res, "Point wajib dipilih", 422);
    if (!kecamatan || !city || cost == null) return fail(res, "kecamatan, city, cost wajib diisi", 422);

    const area = await prisma.deliveryArea.upsert({
      where: { pointId_kecamatan_city: { pointId, kecamatan, city } },
      update: { cost: Number(cost), isActive: true },
      create: { pointId, kecamatan, city, cost: Number(cost) },
    });
    return ok(res, area, "Area pengiriman disimpan", 201);
  } catch (err: any) {
    return fail(res, err.message || "Gagal menyimpan area pengiriman", 400);
  }
}

// PATCH /api/delivery-areas/:id  { cost?, isActive? }
export async function updateDeliveryArea(req: Request, res: Response) {
  const existing = await prisma.deliveryArea.findUnique({ where: { id: req.params.id } });
  if (!existing) return fail(res, "Area pengiriman tidak ditemukan", 404);
  if (!canAccessPoint(req, existing.pointId)) return fail(res, "Area ini bukan milik lokasimu", 403);

  const { cost, isActive } = req.body;
  const data: any = {};
  if (cost != null) data.cost = Number(cost);
  if (isActive != null) data.isActive = !!isActive;

  const area = await prisma.deliveryArea.update({ where: { id: req.params.id }, data });
  return ok(res, area, "Area pengiriman diperbarui");
}

// DELETE /api/delivery-areas/:id
export async function deleteDeliveryArea(req: Request, res: Response) {
  const existing = await prisma.deliveryArea.findUnique({ where: { id: req.params.id } });
  if (!existing) return fail(res, "Area pengiriman tidak ditemukan", 404);
  if (!canAccessPoint(req, existing.pointId)) return fail(res, "Area ini bukan milik lokasimu", 403);

  await prisma.deliveryArea.delete({ where: { id: req.params.id } });
  return ok(res, null, "Area pengiriman dihapus");
}

// POST /api/delivery-areas/quote  { pointIds: string[], kecamatan?, city? }
// Dipakai checkout: sekali panggil buat cek ongkir DELIVERY semua grup Point
// yang ada di keranjang customer, dicocokkan ke kecamatan alamat tujuan.
export async function quoteDeliveryAreas(req: Request, res: Response) {
  const { pointIds, kecamatan, city } = req.body as { pointIds: string[]; kecamatan?: string; city?: string };
  if (!pointIds || !pointIds.length) return fail(res, "pointIds wajib diisi", 422);

  const quotes: Record<string, { available: boolean; cost: number }> = {};
  for (const pointId of pointIds) {
    quotes[pointId] = await getDeliveryCost(pointId, kecamatan, city);
  }
  return ok(res, quotes);
}
