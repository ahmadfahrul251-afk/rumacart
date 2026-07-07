import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { fail } from "../utils/response";

// Menambahkan properti `user` ke tipe Request Express, supaya
// controller bisa akses req.user tanpa TypeScript komplain.
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string };
    }
  }
}

// Middleware = fungsi yang jalan SEBELUM controller.
// Tugasnya di sini: cek apakah request punya token JWT yang valid.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, "Token tidak ditemukan, silakan login", 401);
  }

  const token = header.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
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
