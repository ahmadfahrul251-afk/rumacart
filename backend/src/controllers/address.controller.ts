import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

export async function listMyAddresses(req: Request, res: Response) {
  const addresses = await prisma.address.findMany({ where: { userId: req.user!.userId } });
  return ok(res, addresses);
}

export async function createAddress(req: Request, res: Response) {
  const body = req.body;
  if (!body.recipientName || !body.fullAddress || !body.city) {
    return fail(res, "recipientName, fullAddress, city wajib diisi", 422);
  }
  const address = await prisma.address.create({
    data: {
      userId: req.user!.userId,
      label: body.label || "Rumah",
      recipientName: body.recipientName,
      phone: body.phone,
      fullAddress: body.fullAddress,
      city: body.city,
      province: body.province || "-",
      postalCode: body.postalCode,
      latitude: body.latitude ? Number(body.latitude) : null,
      longitude: body.longitude ? Number(body.longitude) : null,
      isDefault: !!body.isDefault,
    },
  });
  return ok(res, address, "Alamat disimpan", 201);
}

export async function deleteAddress(req: Request, res: Response) {
  await prisma.address.delete({ where: { id: req.params.id } });
  return ok(res, null, "Alamat dihapus");
}
