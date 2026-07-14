import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { scopedPointId, resolveWritePointId } from "../utils/pointScope";

// GET /api/cashflow?from=&to=&pointId=
// Admin Point otomatis cuma lihat cashflow Point-nya sendiri.
export async function listCashflow(req: Request, res: Response) {
  const { from, to } = req.query as Record<string, string>;
  const pointId = scopedPointId(req);
  const where: any = {};
  if (pointId) where.pointId = pointId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const entries = await prisma.cashflow.findMany({
    where,
    include: { point: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, entries);
}

// GET /api/cashflow/summary — dipakai Dashboard Cashflow
export async function cashflowSummary(req: Request, res: Response) {
  const { from, to } = req.query as Record<string, string>;
  const pointId = scopedPointId(req);
  const where: any = {};
  if (pointId) where.pointId = pointId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const entries = await prisma.cashflow.findMany({ where });
  const cashIn = entries.filter((e: any) => e.type === "IN").reduce((s: number, e: any) => s + e.amount, 0);
  const cashOut = entries.filter((e: any) => e.type === "OUT").reduce((s: number, e: any) => s + e.amount, 0);

  // Pecahan uang masuk dari penjualan: berapa yang sebenarnya "modal kembali"
  // vs "keuntungan bersih". Ini murni breakdown pelaporan, tidak mengubah cashIn/cashOut di atas.
  const totalModal = entries.reduce((s: number, e: any) => s + (e.costAmount || 0), 0);
  const totalProfit = entries.reduce((s: number, e: any) => s + (e.profitAmount || 0), 0);

  // ============ SISTEM KANTONG (Pocket Cashflow / Profit First) ============
  // Kantong Inventaris & Kantong Profit mulai dari costAmount/profitAmount tiap
  // penjualan (1 entry Penjualan otomatis kebagi 2 kantong sekaligus), lalu
  // ditambah/dikurangi entry lain yang ditandai `pocket` (belanja supplier,
  // bonus, dll). Kantong Investasi CUMA berisi entry pocket=INVESTASI:
  // "Setor Modal" (IN) bikin Outstanding makin minus, "Pengembalian Investasi"
  // (OUT) bikin Outstanding mendekati nol.
  let kantongInventaris = totalModal;
  let kantongProfit = totalProfit;
  let kantongInvestasi = 0;

  for (const e of entries as any[]) {
    if (e.pocket === "INVENTARIS") kantongInventaris += e.type === "IN" ? e.amount : -e.amount;
    else if (e.pocket === "PROFIT") kantongProfit += e.type === "IN" ? e.amount : -e.amount;
    else if (e.pocket === "INVESTASI") kantongInvestasi += e.type === "IN" ? -e.amount : e.amount;
  }

  return ok(res, {
    cashIn,
    cashOut,
    netCash: cashIn - cashOut,
    totalModal,
    totalProfit,
    kantongInvestasi,
    kantongInventaris,
    kantongProfit,
  });
}

// POST /api/cashflow — input manual (misal: setor modal, belanja stok non-PO,
// bonus karyawan, dll). Wajib pilih `pocket` (Investasi/Inventaris/Profit)
// supaya kelihatan di kantong yang benar.
// Admin Point: pointId dari body diabaikan, dipaksa pakai Point yang dia kelola.
export async function createCashflow(req: Request, res: Response) {
  const { type, category, amount, description, pocket } = req.body;
  if (!type || !category || !amount) return fail(res, "type, category, amount wajib diisi", 422);
  const VALID_POCKETS = ["INVESTASI", "INVENTARIS", "PROFIT"];
  if (pocket && !VALID_POCKETS.includes(pocket)) return fail(res, "Kantong tidak valid", 422);
  const pointId = resolveWritePointId(req, req.body.pointId);

  const entry = await prisma.cashflow.create({
    data: { type, category, amount: Number(amount), description, pocket, pointId, createdById: req.user?.userId },
  });
  return ok(res, entry, "Cashflow dicatat", 201);
}
