import { Request, Response } from "express";
import { prisma } from "../config/db";
import { createStockTransfer, receiveStockTransfer, cancelStockTransfer } from "../services/stockTransfer.service";
import { ok, fail } from "../utils/response";
import { scopedPointId, canAccessPoint } from "../utils/pointScope";

// POST /api/stock-transfers  { toPointId, notes, items: [{productId, qty}] }
// Hanya Admin Pusat yang bisa membuat transfer (dia berperan sebagai supplier internal).
export async function createTransfer(req: Request, res: Response) {
  try {
    const { toPointId, notes, items } = req.body;
    if (!toPointId) return fail(res, "Point tujuan wajib diisi", 422);

    const transfer = await createStockTransfer({
      toPointId,
      notes,
      items: items || [],
      createdById: req.user!.userId,
    });
    return ok(res, transfer, "Transfer stok dikirim", 201);
  } catch (err: any) {
    return fail(res, err.message || "Gagal membuat transfer stok", 400);
  }
}

// GET /api/stock-transfers?status=&pointId= — Admin Point otomatis cuma lihat
// transfer yang ditujukan ke Point-nya sendiri.
export async function listTransfers(req: Request, res: Response) {
  const { status } = req.query as Record<string, string>;
  const pointId = scopedPointId(req);
  const where: any = {};
  if (status) where.status = status;
  if (pointId) where.toPointId = pointId;

  const transfers = await prisma.stockTransfer.findMany({
    where,
    include: { items: true, toPoint: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, transfers);
}

// GET /api/stock-transfers/:id
export async function getTransfer(req: Request, res: Response) {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } }, toPoint: true, createdBy: true },
  });
  if (!transfer) return fail(res, "Transfer stok tidak ditemukan", 404);
  if (!canAccessPoint(req, transfer.toPointId)) return fail(res, "Transfer ini bukan tujuan Point kamu", 403);
  return ok(res, transfer);
}

// PATCH /api/stock-transfers/:id/receive — Point tujuan (atau Admin Pusat) konfirmasi barang sudah sampai
export async function receiveTransfer(req: Request, res: Response) {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) return fail(res, "Transfer stok tidak ditemukan", 404);
    if (!canAccessPoint(req, transfer.toPointId)) return fail(res, "Transfer ini bukan tujuan Point kamu", 403);

    const updated = await receiveStockTransfer(req.params.id, req.user!.userId);
    return ok(res, updated, "Stok diterima & inventory diperbarui");
  } catch (err: any) {
    return fail(res, err.message || "Gagal menerima transfer stok", 400);
  }
}

// PATCH /api/stock-transfers/:id/cancel — cuma Admin Pusat (dicek lewat route)
export async function cancelTransfer(req: Request, res: Response) {
  try {
    const transfer = await cancelStockTransfer(req.params.id);
    return ok(res, transfer, "Transfer stok dibatalkan");
  } catch (err: any) {
    return fail(res, err.message || "Gagal membatalkan transfer stok", 400);
  }
}
