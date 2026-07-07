// Satu instance PrismaClient dipakai di seluruh aplikasi (best practice).
// Kalau bikin instance baru di setiap file, koneksi ke database bisa membludak.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
