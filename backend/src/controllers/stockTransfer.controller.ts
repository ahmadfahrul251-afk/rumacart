import { Request, Response } from "express";
import { prisma } from "../config/db";
import { createStockTransfer, receiveStockTransfer, cancelStockTransfer } from "../services/stockTransfer.service";
import { checkAndCreateRestockRequest } from "../services/restockRequest.service";
import { ok, fail } from "../utils/response";
import { scopedPointId, canAccessPoint, resolveWritePointId } from "../utils/pointScope";

// POST /api/stock-transfers  { fromPointId?, toPointId, notes, items: [{productId, qty}] }
// Admin Pusat/Gudang: bebas pilih fromPointId mana pun (atau kosongkan = mode lama
// "dari Pusat", stok sumber tidak dipotong). Admin Lokasi (RDH/Mart/Point): fromPointId
// otomatis dipaksa ke lokasinya sendiri — cuma bisa kirim transfer KELUAR dari situ.
export async function createTransfer(req: Request, res: Response) {
  try {
    const { toPointId, notes, items } = req.body;
    if (!toPointId) return fail(res, "Lokasi tujuan wajib diisi", 422);
    const fromPointId = resolveWritePointId(req, req.body.fromPointId);

    const transfer = await createStockTransfer({
      fromPointId,
      toPointId,
      notes,
      items: items || [],
      createdById: req.user!.userId,
    });

    // Smart Restock: kirim transfer keluar bisa bikin stok lokasi asal turun
    // sampai/di bawah minStock — cek & buatkan Restock Request kalau perlu.
    if (fromPointId) {
      for (const item of items || []) {
        await checkAndCreateRestockRequest(item.productId, fromPointId).catch(() => {});
      }
    }

    return ok(res, transfer, "Transfer stok dikirim", 201);
  } catch (err: any) {
    return fail(res, err.message || "Gagal membuat transfer stok", 400);
  }
}

// GET /api/stock-transfers?status=&pointId= — Admin Lokasi otomatis cuma lihat
// transfer yang ditujukan KE lokasinya ATAU dikirim DARI lokasinya sendiri.
export async function listTransfers(req: Request, res: Response) {
  const { status } = req.query as Record<string, string>;
  const pointId = scopedPointId(req);
  const where: any = {};
  if (status) where.status = status;
  if (pointId) where.OR = [{ toPointId: pointId }, { fromPointId: pointId }];

  const transfers = await prisma.stockTransfer.findMany({
    where,
    include: { items: true, toPoint: true, fromPoint: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, transfers);
}

// GET /api/stock-transfers/:id
export async function getTransfer(req: Request, res: Response) {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } }, toPoint: true, fromPoint: true, createdBy: true },
  });
  if (!transfer) return fail(res, "Transfer stok tidak ditemukan", 404);
  const canAccess = canAccessPoint(req, transfer.toPointId) || canAccessPoint(req, transfer.fromPointId);
  if (!canAccess) return fail(res, "Transfer ini bukan milik lokasi kamu", 403);
  return ok(res, transfer);
}

// PATCH /api/stock-transfers/:id/receive — lokasi tujuan (atau Admin Pusat) konfirmasi barang sudah sampai
export async function receiveTransfer(req: Request, res: Response) {
  try {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
    if (!transfer) return fail(res, "Transfer stok tidak ditemukan", 404);
    if (!canAccessPoint(req, transfer.toPointId)) return fail(res, "Transfer ini bukan tujuan lokasi kamu", 403);

    const updated = await receiveStockTransfer(req.params.id, req.user!.userId);
    return ok(res, updated, "Stok diterima & inventory diperbarui");
  } catch (err: any) {
    return fail(res, err.message || "Gagal menerima transfer stok", 400);
  }
}

// PATCH /api/stock-transfers/:id/cancel — Admin Pusat, atau Admin Lokasi yang
// mengirim transfer ini sendiri (fromPointId miliknya).
export async function cancelTransfer(req: Request, res: Response) {
  try {
    const existing = await prisma.stockTransfer.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, "Transfer stok tidak ditemukan", 404);
    const isPusat = req.user!.role === "ADMIN" || req.user!.role === "SUPER_ADMIN";
    if (!isPusat && !canAccessPoint(req, existing.fromPointId)) {
      return fail(res, "Kamu cuma bisa membatalkan transfer yang kamu kirim sendiri", 403);
    }

    const transfer = await cancelStockTransfer(req.params.id);
    return ok(res, transfer, "Transfer stok dibatalkan");
  } catch (err: any) {
    return fail(res, err.message || "Gagal membatalkan transfer stok", 400);
  }
}
