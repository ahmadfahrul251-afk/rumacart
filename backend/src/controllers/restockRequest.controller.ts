import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { resolveWritePointId, canAccessPoint } from "../utils/pointScope";
import {
  createManualRestockRequest,
  approveRestockRequest,
  rejectRestockRequest,
  fulfillRestockRequest,
} from "../services/restockRequest.service";

// GET /api/restock-requests?status= — Admin Pusat lihat semua. Admin Lokasi lihat
// request yang dia AJUKAN (pointId miliknya) ATAU yang dia harus PENUHI (sourceHubId miliknya).
export async function listRestockRequests(req: Request, res: Response) {
  const { status } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;

  if (req.user!.role === "ADMIN_POINT") {
    const myPointId = req.user!.managedPointId;
    where.OR = [{ pointId: myPointId }, { sourceHubId: myPointId }];
  }

  const requests = await prisma.restockRequest.findMany({
    where,
    include: { point: true, sourceHub: true, product: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, requests);
}

// POST /api/restock-requests  { productId, qty, pointId?, sourceHubId?, note? }
// Admin Lokasi: pointId otomatis dikunci ke lokasinya sendiri (permintaan restock
// buat lokasinya). Admin Pusat: wajib isi pointId (mengajukan atas nama lokasi tertentu).
export async function createRestockRequest(req: Request, res: Response) {
  try {
    const { productId, qty, sourceHubId, note } = req.body;
    const pointId = resolveWritePointId(req, req.body.pointId);
    if (!pointId) return fail(res, "Lokasi peminta wajib diisi", 422);
    if (!productId) return fail(res, "Produk wajib dipilih", 422);

    const request = await createManualRestockRequest({ pointId, productId, qty: Number(qty), sourceHubId, note });
    return ok(res, request, "Restock Request dibuat", 201);
  } catch (err: any) {
    return fail(res, err.message || "Gagal membuat Restock Request", 400);
  }
}

// PATCH /api/restock-requests/:id/approve  { sourceHubId? }
// Cuma Admin Pusat atau Admin lokasi sumber (sourceHubId) yang boleh approve.
export async function approveRestockRequestCtrl(req: Request, res: Response) {
  try {
    const existing = await prisma.restockRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, "Restock Request tidak ditemukan", 404);
    const isPusat = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
    const targetSourceHubId = req.body.sourceHubId || existing.sourceHubId;
    if (!isPusat && !canAccessPoint(req, targetSourceHubId)) {
      return fail(res, "Kamu bukan lokasi sumber yang dituju permintaan ini", 403);
    }

    const request = await approveRestockRequest(req.params.id, req.body.sourceHubId);
    return ok(res, request, "Restock Request disetujui");
  } catch (err: any) {
    return fail(res, err.message || "Gagal menyetujui Restock Request", 400);
  }
}

// PATCH /api/restock-requests/:id/reject
export async function rejectRestockRequestCtrl(req: Request, res: Response) {
  try {
    const existing = await prisma.restockRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, "Restock Request tidak ditemukan", 404);
    const isPusat = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
    if (!isPusat && !canAccessPoint(req, existing.sourceHubId)) {
      return fail(res, "Kamu bukan lokasi sumber yang dituju permintaan ini", 403);
    }

    const request = await rejectRestockRequest(req.params.id);
    return ok(res, request, "Restock Request ditolak");
  } catch (err: any) {
    return fail(res, err.message || "Gagal menolak Restock Request", 400);
  }
}

// PATCH /api/restock-requests/:id/fulfill — bikinkan Stock Transfer dari lokasi sumber.
export async function fulfillRestockRequestCtrl(req: Request, res: Response) {
  try {
    const existing = await prisma.restockRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, "Restock Request tidak ditemukan", 404);
    const isPusat = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
    if (!isPusat && !canAccessPoint(req, existing.sourceHubId)) {
      return fail(res, "Kamu bukan lokasi sumber yang dituju permintaan ini", 403);
    }

    const request = await fulfillRestockRequest(req.params.id, req.user!.userId);
    return ok(res, request, "Restock Request di-fulfill, Transfer Stok otomatis dibuat");
  } catch (err: any) {
    return fail(res, err.message || "Gagal fulfill Restock Request", 400);
  }
}
