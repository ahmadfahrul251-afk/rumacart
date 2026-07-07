import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return ok(res, categories);
}

export async function createCategory(req: Request, res: Response) {
  const { name, slug, icon, description } = req.body;
  if (!name || !slug) return fail(res, "name dan slug wajib diisi", 422);
  const category = await prisma.category.create({ data: { name, slug, icon, description } });
  return ok(res, category, "Kategori dibuat", 201);
}

export async function updateCategory(req: Request, res: Response) {
  const { id } = req.params;
  const category = await prisma.category.update({ where: { id }, data: req.body });
  return ok(res, category, "Kategori diperbarui");
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.category.update({ where: { id }, data: { isActive: false } });
  return ok(res, null, "Kategori dihapus");
}
