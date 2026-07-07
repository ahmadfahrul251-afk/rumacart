import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

export async function listVouchers(_req: Request, res: Response) {
  const vouchers = await prisma.voucher.findMany({ where: { isActive: true } });
  return ok(res, vouchers);
}

// POST /api/vouchers/validate  { code, subtotal }
export async function validateVoucher(req: Request, res: Response) {
  const { code, subtotal } = req.body;
  const voucher = await prisma.voucher.findUnique({ where: { code } });
  if (!voucher || !voucher.isActive) return fail(res, "Voucher tidak ditemukan", 404);
  if (voucher.used >= voucher.quota) return fail(res, "Voucher sudah habis", 400);
  if (voucher.expiresAt && voucher.expiresAt < new Date()) return fail(res, "Voucher sudah kadaluarsa", 400);
  if (subtotal < voucher.minPurchase) {
    return fail(res, `Minimal belanja Rp${voucher.minPurchase.toLocaleString("id-ID")}`, 400);
  }
  return ok(res, voucher, "Voucher valid");
}

export async function createVoucher(req: Request, res: Response) {
  const { code, description, discountAmount, minPurchase, quota, expiresAt } = req.body;
  if (!code || !discountAmount) return fail(res, "code dan discountAmount wajib diisi", 422);
  const voucher = await prisma.voucher.create({
    data: {
      code,
      description,
      discountAmount: Number(discountAmount),
      minPurchase: Number(minPurchase) || 0,
      quota: Number(quota) || 100,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  return ok(res, voucher, "Voucher dibuat", 201);
}
