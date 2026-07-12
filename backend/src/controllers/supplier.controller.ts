import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

// Supplier pusat-wide (pointId null) kelihatan & dipakai semua Point. Supplier
// lokal (pointId terisi) cuma kelihatan buat Point itu + Admin Pusat.
// Admin Point CUMA boleh edit/nonaktifkan supplier lokal miliknya sendiri —
// supplier pusat-wide boleh dilihat & dipakai di PO, tapi tidak boleh diedit.
function canEditSupplier(req: Request, supplier: { pointId: string | null }): boolean {
  if (req.user?.role !== "ADMIN_POINT") return true;
  return supplier.pointId === req.user.managedPointId;
}

// GET /api/suppliers — daftar supplier (default hanya yang aktif, ?all=1 untuk semua)
export async function listSuppliers(req: Request, res: Response) {
  const showAll = req.query.all === "1";
  const where: any = showAll ? {} : { isActive: true };

  if (req.user?.role === "ADMIN_POINT") {
    where.OR = [{ pointId: null }, { pointId: req.user.managedPointId }];
  } else if (req.query.pointId) {
    // Admin Pusat/Gudang: filter lihat supplier lokal 1 Point tertentu, tetap sertakan yang pusat-wide.
    where.OR = [{ pointId: null }, { pointId: req.query.pointId as string }];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: { point: true },
    orderBy: { name: "asc" },
  });
  return ok(res, suppliers);
}

// GET /api/suppliers/:id
export async function getSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!supplier) return fail(res, "Supplier tidak ditemukan", 404);
  if (req.user?.role === "ADMIN_POINT" && supplier.pointId && supplier.pointId !== req.user.managedPointId) {
    return fail(res, "Supplier ini bukan milik Point kamu", 403);
  }
  return ok(res, supplier);
}

// POST /api/suppliers  { name, contactName, phone, email, address, pointId }
// Admin Point: pointId dari body diabaikan, dipaksa jadi supplier lokal Point-nya sendiri.
// Admin Pusat/Gudang: kosongkan pointId untuk supplier pusat-wide, atau isi untuk supplier lokal 1 Point.
export async function createSupplier(req: Request, res: Response) {
  const { name, contactName, phone, email, address } = req.body;
  if (!name) return fail(res, "Nama supplier wajib diisi", 422);

  let pointId: string | null = req.body.pointId || null;
  if (req.user?.role === "ADMIN_POINT") {
    pointId = req.user.managedPointId || null;
  }

  const supplier = await prisma.supplier.create({
    data: { name, contactName, phone, email, address, pointId },
  });
  return ok(res, supplier, "Supplier ditambahkan", 201);
}

// PATCH /api/suppliers/:id
export async function updateSupplier(req: Request, res: Response) {
  const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!existing) return fail(res, "Supplier tidak ditemukan", 404);
  if (!canEditSupplier(req, existing)) return fail(res, "Kamu tidak bisa mengedit supplier ini", 403);

  const { name, contactName, phone, email, address, isActive } = req.body;
  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: { name, contactName, phone, email, address, isActive },
  });
  return ok(res, supplier, "Supplier diperbarui");
}

// DELETE /api/suppliers/:id — soft delete (nonaktifkan), supaya riwayat PO lama tetap utuh
export async function deactivateSupplier(req: Request, res: Response) {
  const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!existing) return fail(res, "Supplier tidak ditemukan", 404);
  if (!canEditSupplier(req, existing)) return fail(res, "Kamu tidak bisa menonaktifkan supplier ini", 403);

  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  return ok(res, supplier, "Supplier dinonaktifkan");
}
