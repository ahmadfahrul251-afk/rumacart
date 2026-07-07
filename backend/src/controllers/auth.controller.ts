import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { ok, fail } from "../utils/response";

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
// Role selalu CUSTOMER lewat endpoint ini — role lain (Admin, Kasir, dst)
// hanya bisa dibuat oleh Super Admin lewat menu User Management.
export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "Data tidak valid", 422, parsed.error.flatten());
  }
  const { name, email, password, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return fail(res, "Email sudah terdaftar", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash, role: "CUSTOMER" },
  });

  const token = signToken({ userId: user.id, role: user.role });
  return ok(res, { token, user: sanitize(user) }, "Registrasi berhasil", 201);
}

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "Data tidak valid", 422, parsed.error.flatten());
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return fail(res, "Email atau password salah", 401);
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    return fail(res, "Email atau password salah", 401);
  }

  const token = signToken({ userId: user.id, role: user.role });
  return ok(res, { token, user: sanitize(user) }, "Login berhasil");
}

// GET /api/auth/me — cek user yang sedang login (dipakai frontend saat refresh halaman)
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return fail(res, "User tidak ditemukan", 404);
  return ok(res, sanitize(user));
}

// Jangan pernah kirim passwordHash ke frontend
function sanitize(user: { passwordHash?: string; [key: string]: any }) {
  const { passwordHash, ...rest } = user;
  return rest;
}
