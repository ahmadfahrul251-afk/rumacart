import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

// GET /api/cashflow?from=&to=&pointId=
export async function listCashflow(req: Request, res: Response) {
  const { from, to, pointId } = req.query as Record<string, string>;
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
  const where: any = {};
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

  return ok(res, {
    cashIn,
    cashOut,
    netCash: cashIn - cashOut,
    totalModal,
    totalProfit,
  });
}

// POST /api/cashflow — input manual (misal: pengeluaran operasional, gaji, dll)
export async function createCashflow(req: Request, res: Response) {
  const { type, category, amount, description, pointId } = req.body;
  if (!type || !category || !amount) return fail(res, "type, category, amount wajib diisi", 422);

  const entry = await prisma.cashflow.create({
    data: { type, category, amount: Number(amount), description, pointId, createdById: req.user?.userId },
  });
  return ok(res, entry, "Cashflow dicatat", 201);
}
