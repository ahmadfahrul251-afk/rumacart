import { Request, Response } from "express";
import { prisma } from "../config/db";
import { createPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder } from "../services/purchaseOrder.service";
import { ok, fail } from "../utils/response";
import { scopedPointId, canAccessPoint } from "../utils/pointScope";

// POST /api/purchase-orders  { supplierId, pointId, notes, items: [{productId, qty, costPrice}] }
// Admin Point: pointId dari body diabaikan (dipaksa pakai Point-nya sendiri), dan
// supplier yang dipilih harus kelihatan buat dia (pusat-wide atau lokal Point-nya).
export async function createPo(req: Request, res: Response) {
  try {
    const { supplierId, notes, items } = req.body;
    let pointId: string | undefined = req.body.pointId;
    if (req.user!.role === "ADMIN_POINT") {
      pointId = req.user!.managedPointId || undefined;
    }
    if (!supplierId || !pointId) return fail(res, "Supplier dan Point tujuan wajib diisi", 422);

    if (req.user!.role === "ADMIN_POINT") {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier || (supplier.pointId && supplier.pointId !== pointId)) {
        return fail(res, "Supplier ini tidak tersedia untuk Point kamu", 403);
      }
    }

    const po = await createPurchaseOrder({
      supplierId,
      pointId,
      notes,
      items: items || [],
      createdById: req.user!.userId,
    });
    return ok(res, po, "Purchase Order dibuat", 201);
  } catch (err: any) {
    return fail(res, err.message || "Gagal membuat Purchase Order", 400);
  }
}

// GET /api/purchase-orders?status=&pointId=&supplierId= — Admin Point otomatis
// cuma lihat PO Point-nya sendiri.
export async function listPo(req: Request, res: Response) {
  const { status, supplierId } = req.query as Record<string, string>;
  const pointId = scopedPointId(req);
  const where: any = {};
  if (status) where.status = status;
  if (pointId) where.pointId = pointId;
  if (supplierId) where.supplierId = supplierId;

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include: { items: true, supplier: true, point: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, purchaseOrders);
}

// GET /api/purchase-orders/:id
export async function getPo(req: Request, res: Response) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } }, supplier: true, point: true, createdBy: true },
  });
  if (!po) return fail(res, "Purchase Order tidak ditemukan", 404);
  if (!canAccessPoint(req, po.pointId)) return fail(res, "Purchase Order ini bukan milik Point kamu", 403);
  return ok(res, po);
}

// PATCH /api/purchase-orders/:id/receive — barang dari supplier sudah datang
export async function receivePo(req: Request, res: Response) {
  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, "Purchase Order tidak ditemukan", 404);
    if (!canAccessPoint(req, existing.pointId)) return fail(res, "Purchase Order ini bukan milik Point kamu", 403);

    const po = await receivePurchaseOrder(req.params.id, req.user!.userId);
    return ok(res, po, "Barang diterima, stok & cashflow diperbarui");
  } catch (err: any) {
    return fail(res, err.message || "Gagal menerima barang", 400);
  }
}

// PATCH /api/purchase-orders/:id/cancel
export async function cancelPo(req: Request, res: Response) {
  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, "Purchase Order tidak ditemukan", 404);
    if (!canAccessPoint(req, existing.pointId)) return fail(res, "Purchase Order ini bukan milik Point kamu", 403);

    const po = await cancelPurchaseOrder(req.params.id);
    return ok(res, po, "Purchase Order dibatalkan");
  } catch (err: any) {
    return fail(res, err.message || "Gagal membatalkan Purchase Order", 400);
  }
}
