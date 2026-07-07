import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

export async function listPoints(_req: Request, res: Response) {
  const points = await prisma.fulfillmentPoint.findMany({ where: { isActive: true } });
  return ok(res, points);
}

export async function createPoint(req: Request, res: Response) {
  const { name, code, address, city, latitude, longitude, phone } = req.body;
  if (!name || !code || !address || !city) {
    return fail(res, "name, code, address, city wajib diisi", 422);
  }
  const point = await prisma.fulfillmentPoint.create({
    data: { name, code, address, city, latitude: Number(latitude), longitude: Number(longitude), phone },
  });
  return ok(res, point, "Point dibuat", 201);
}

export async function updatePoint(req: Request, res: Response) {
  const { id } = req.params;
  const point = await prisma.fulfillmentPoint.update({ where: { id }, data: req.body });
  return ok(res, point, "Point diperbarui");
}
