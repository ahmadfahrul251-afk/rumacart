import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { calcVoucherDiscount } from "../services/voucher.service";
import { notifyAllCustomers } from "../services/notification.service";

// GET /api/vouchers — default hanya voucher aktif (untuk customer). ?all=1 untuk Admin (semua voucher).
export async function listVouchers(req: Request, res: Response) {
  const showAll = req.query.all === "1";
  const vouchers = await prisma.voucher.findMany({
    where: showAll ? {} : { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, vouchers);
}

// GET /api/vouchers/:id
export async function getVoucher(req: Request, res: Response) {
  const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id } });
  if (!voucher) return fail(res, "Voucher tidak ditemukan", 404);
  return ok(res, voucher);
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
  const discount = calcVoucherDiscount(voucher, Number(subtotal) || 0);
  return ok(res, { ...voucher, discount }, "Voucher valid");
}

// POST /api/vouchers
export async function createVoucher(req: Request, res: Response) {
  const { code, description, discountType, discountAmount, maxDiscount, minPurchase, quota, expiresAt } = req.body;
  if (!code || !discountAmount) return fail(res, "code dan discountAmount wajib diisi", 422);
  const type = discountType === "PERCENT" ? "PERCENT" : "FLAT";
  if (type === "PERCENT" && (Number(discountAmount) <= 0 || Number(discountAmount) > 100)) {
    return fail(res, "Untuk tipe persen, discountAmount harus antara 1-100", 422);
  }

  const voucher = await prisma.voucher.create({
    data: {
      code: String(code).toUpperCase(),
      description,
      discountType: type,
      discountAmount: Number(discountAmount),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      minPurchase: Number(minPurchase) || 0,
      quota: Number(quota) || 100,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Kabari semua customer bahwa ada promo baru.
  const label =
    voucher.discountType === "PERCENT"
      ? `diskon ${voucher.discountAmount}%`
      : `potongan Rp${voucher.discountAmount.toLocaleString("id-ID")}`;
  await notifyAllCustomers({
    title: "Promo Baru!",
    message: `Ada voucher baru "${voucher.code}" — ${label}. Yuk cek halaman Promo sebelum kehabisan!`,
    type: "PROMO",
    refId: voucher.id,
  });

  return ok(res, voucher, "Voucher dibuat", 201);
}

// PATCH /api/vouchers/:id
export async function updateVoucher(req: Request, res: Response) {
  const { description, discountType, discountAmount, maxDiscount, minPurchase, quota, expiresAt, isActive } = req.body;

  const data: any = {};
  if (description !== undefined) data.description = description;
  if (discountType !== undefined) data.discountType = discountType === "PERCENT" ? "PERCENT" : "FLAT";
  if (discountAmount !== undefined) data.discountAmount = Number(discountAmount);
  if (maxDiscount !== undefined) data.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
  if (minPurchase !== undefined) data.minPurchase = Number(minPurchase);
  if (quota !== undefined) data.quota = Number(quota);
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (isActive !== undefined) data.isActive = isActive;

  const voucher = await prisma.voucher.update({ where: { id: req.params.id }, data });
  return ok(res, voucher, "Voucher diperbarui");
}

// DELETE /api/vouchers/:id — soft delete (nonaktifkan), supaya riwayat order lama tetap utuh
export async function deactivateVoucher(req: Request, res: Response) {
  const voucher = await prisma.voucher.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  return ok(res, voucher, "Voucher dinonaktifkan");
}
