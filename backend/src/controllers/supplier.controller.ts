import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

// GET /api/suppliers — daftar supplier (default hanya yang aktif, ?all=1 untuk semua)
export async function listSuppliers(req: Request, res: Response) {
  const showAll = req.query.all === "1";
  const suppliers = await prisma.supplier.findMany({
    where: showAll ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
  return ok(res, suppliers);
}

// GET /api/suppliers/:id
export async function getSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!supplier) return fail(res, "Supplier tidak ditemukan", 404);
  return ok(res, supplier);
}

// POST /api/suppliers  { name, contactName, phone, email, address }
export async function createSupplier(req: Request, res: Response) {
  const { name, contactName, phone, email, address } = req.body;
  if (!name) return fail(res, "Nama supplier wajib diisi", 422);

  const supplier = await prisma.supplier.create({
    data: { name, contactName, phone, email, address },
  });
  return ok(res, supplier, "Supplier ditambahkan", 201);
}

// PATCH /api/suppliers/:id
export async function updateSupplier(req: Request, res: Response) {
  const { name, contactName, phone, email, address, isActive } = req.body;
  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: { name, contactName, phone, email, address, isActive },
  });
  return ok(res, supplier, "Supplier diperbarui");
}

// DELETE /api/suppliers/:id — soft delete (nonaktifkan), supaya riwayat PO lama tetap utuh
export async function deactivateSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  return ok(res, supplier, "Supplier dinonaktifkan");
}
