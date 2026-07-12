import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/db";
import { fail } from "../utils/response";

// Menambahkan properti `user` ke tipe Request Express, supaya
// controller bisa akses req.user tanpa TypeScript komplain.
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string; managedPointId?: string | null };
    }
  }
}

// Middleware = fungsi yang jalan SEBELUM controller.
// Tugasnya di sini: cek apakah request punya token JWT yang valid, lalu ambil
// data role/Point/status aktif TERBARU dari database (bukan cuma dari isi token)
// supaya perubahan role, Point yang dikelola, atau nonaktifkan akun langsung
// berlaku tanpa harus menunggu token lama (berlaku 7 hari) kadaluarsa.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, "Token tidak ditemukan, silakan login", 401);
  }

  const token = header.split(" ")[1];
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, managedPointId: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return fail(res, "Akun tidak ditemukan atau sudah dinonaktifkan", 401);
    }
    req.user = { userId: user.id, role: user.role, managedPointId: user.managedPointId };
    next(); // lanjut ke middleware/controller berikutnya
  } catch {
    return fail(res, "Token tidak valid atau kadaluarsa", 401);
  }
}

// Membatasi endpoint hanya untuk role tertentu.
// Contoh pakai: requireRole("ADMIN", "SUPER_ADMIN")
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, "Kamu tidak punya akses ke resource ini", 403);
    }
    next();
  };
}
