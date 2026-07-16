import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

export async function listMyAddresses(req: Request, res: Response) {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return ok(res, addresses);
}

export async function createAddress(req: Request, res: Response) {
  const body = req.body;
  if (!body.recipientName || !body.fullAddress || !body.city) {
    return fail(res, "recipientName, fullAddress, city wajib diisi", 422);
  }

  const userId = req.user!.userId;
  const existingCount = await prisma.address.count({ where: { userId } });
  // Alamat pertama otomatis jadi utama, biar customer tidak perlu set manual.
  const makeDefault = !!body.isDefault || existingCount === 0;

  const data = {
    userId,
    label: body.label || "Rumah",
    recipientName: body.recipientName,
    phone: body.phone,
    fullAddress: body.fullAddress,
    kecamatan: body.kecamatan || null,
    city: body.city,
    province: body.province || "-",
    postalCode: body.postalCode,
    latitude: body.latitude ? Number(body.latitude) : null,
    longitude: body.longitude ? Number(body.longitude) : null,
    isDefault: makeDefault,
  };

  const address = makeDefault
    ? (
        await prisma.$transaction([
          prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
          prisma.address.create({ data }),
        ])
      )[1]
    : await prisma.address.create({ data });

  return ok(res, address, "Alamat disimpan", 201);
}

export async function updateAddress(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userId;
  const body = req.body;

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return fail(res, "Alamat tidak ditemukan", 404);
  }

  const data: Record<string, any> = {};
  for (const field of ["label", "recipientName", "phone", "fullAddress", "kecamatan", "city", "province", "postalCode"]) {
    if (body[field] !== undefined) data[field] = body[field];
  }
  if (body.latitude !== undefined) data.latitude = body.latitude ? Number(body.latitude) : null;
  if (body.longitude !== undefined) data.longitude = body.longitude ? Number(body.longitude) : null;

  const makeDefault = body.isDefault === true;
  if (makeDefault) data.isDefault = true;

  const address = makeDefault
    ? (
        await prisma.$transaction([
          prisma.address.updateMany({ where: { userId, NOT: { id } }, data: { isDefault: false } }),
          prisma.address.update({ where: { id }, data }),
        ])
      )[1]
    : await prisma.address.update({ where: { id }, data });

  return ok(res, address, "Alamat diperbarui");
}

export async function deleteAddress(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userId;

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return fail(res, "Alamat tidak ditemukan", 404);
  }

  await prisma.address.delete({ where: { id } });

  // Kalau yang dihapus itu alamat utama dan masih ada alamat lain tersisa,
  // otomatis jadikan salah satunya (yang terbaru) sebagai alamat utama baru.
  if (existing.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  return ok(res, null, "Alamat dihapus");
}
