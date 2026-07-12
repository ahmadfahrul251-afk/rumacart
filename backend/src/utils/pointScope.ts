import { Request } from "express";

// ADMIN_POINT WAJIB terkunci ke Point yang dia kelola — pointId dari query/body
// manapun diabaikan. ADMIN/SUPER_ADMIN (Admin Pusat) boleh pilih pointId lewat
// query (?pointId=xxx) untuk lihat 1 Point, atau kosongkan untuk lihat semua Point.
export function scopedPointId(req: Request): string | undefined {
  if (req.user?.role === "ADMIN_POINT") {
    return req.user.managedPointId || undefined;
  }
  return (req.query.pointId as string) || undefined;
}

// Buat endpoint yang nulis data (stock-in, cashflow manual, dst): tentukan
// pointId yang benar-benar dipakai. ADMIN_POINT dipaksa pakai Point-nya sendiri
// walau body yang dikirim client mencantumkan pointId lain.
export function resolveWritePointId(req: Request, bodyPointId?: string | null): string | undefined {
  if (req.user?.role === "ADMIN_POINT") {
    return req.user.managedPointId || undefined;
  }
  return bodyPointId || undefined;
}

// Cek apakah ADMIN_POINT boleh akses 1 data yang sudah terikat ke pointId
// tertentu (misal: detail order, update status, verifikasi bayar). Role lain
// (ADMIN, SUPER_ADMIN, GUDANG, KASIR, KURIR) tidak dibatasi di sini.
export function canAccessPoint(req: Request, pointId: string | null | undefined): boolean {
  if (req.user?.role !== "ADMIN_POINT") return true;
  return !!pointId && pointId === req.user.managedPointId;
}
