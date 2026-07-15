import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { hashPassword } from "../utils/password";
import { ok, fail } from "../utils/response";

// Semua role selain CUSTOMER dianggap "akun staff" dan dikelola lewat menu ini.
// Akun CUSTOMER tetap lewat /auth/register seperti biasa.
const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "ADMIN_POINT", "KASIR", "GUDANG", "KURIR"] as const;

const createUserSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    phone: z.string().optional(),
    role: z.enum(STAFF_ROLES),
    managedPointId: z.string().optional().nullable(),
  })
  .refine((d) => d.role !== "ADMIN_POINT" || !!d.managedPointId, {
    message: "Point wajib dipilih untuk role Admin Point",
    path: ["managedPointId"],
  });

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(STAFF_ROLES).optional(),
  managedPointId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// GET /api/users — daftar akun staff. Bisa difilter ?role=KASIR dst.
export async function listUsers(req: Request, res: Response) {
  const role = req.query.role as string | undefined;
  if (role && !STAFF_ROLES.includes(role as any)) {
    return fail(res, "Role tidak valid", 422);
  }

  const users = await prisma.user.findMany({
    where: { role: role ? (role as any) : { in: STAFF_ROLES as unknown as string[] } },
    include: { managedPoint: { select: { id: true, name: true, code: true, type: true, parentHubId: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, users.map(sanitize));
}

// POST /api/users — buat akun staff baru (Kasir, Gudang, Kurir, Admin Point, Admin, Super Admin)
export async function createUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, "Data tidak valid", 422, parsed.error.flatten());
  const { name, email, password, phone, role, managedPointId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail(res, "Email sudah terdaftar", 409);

  if (role === "ADMIN_POINT") {
    const point = await prisma.fulfillmentPoint.findUnique({ where: { id: managedPointId! } });
    if (!point) return fail(res, "Point tidak ditemukan", 404);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role,
      managedPointId: role === "ADMIN_POINT" ? managedPointId : null,
    },
    include: { managedPoint: { select: { id: true, name: true, code: true, type: true, parentHubId: true } } },
  });

  return ok(res, sanitize(user), "Akun staff berhasil dibuat", 201);
}

// PATCH /api/users/:id — edit akun staff: ganti role, Point yang dikelola,
// aktif/nonaktifkan akun, atau reset password.
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) return fail(res, "User tidak ditemukan", 404);
  if (existingUser.role === "CUSTOMER") return fail(res, "Bukan akun staff", 400);

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, "Data tidak valid", 422, parsed.error.flatten());
  const data = parsed.data;

  // Cegah akun mengubah role sendiri atau menonaktifkan diri sendiri (bisa
  // menyebabkan tidak ada lagi Admin yang bisa masuk ke menu ini).
  if (id === req.user!.userId && (data.role || data.isActive === false)) {
    return fail(res, "Tidak bisa mengubah role atau menonaktifkan akun sendiri", 400);
  }

  const nextRole = data.role ?? existingUser.role;
  let nextManagedPointId: string | null =
    data.managedPointId !== undefined ? data.managedPointId : existingUser.managedPointId;

  if (nextRole === "ADMIN_POINT") {
    if (!nextManagedPointId) return fail(res, "Point wajib dipilih untuk role Admin Point", 422);
    const point = await prisma.fulfillmentPoint.findUnique({ where: { id: nextManagedPointId } });
    if (!point) return fail(res, "Point tidak ditemukan", 404);
  } else {
    nextManagedPointId = null; // role selain Admin Point tidak boleh terkunci ke Point manapun
  }

  const updateData: Record<string, unknown> = {
    role: nextRole,
    managedPointId: nextManagedPointId,
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.passwordHash = await hashPassword(data.password);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { managedPoint: { select: { id: true, name: true, code: true, type: true, parentHubId: true } } },
  });

  return ok(res, sanitize(user), "Akun staff berhasil diperbarui");
}

// Jangan pernah kirim passwordHash ke frontend
function sanitize(user: { passwordHash?: string; [key: string]: any }) {
  const { passwordHash, ...rest } = user;
  return rest;
}
