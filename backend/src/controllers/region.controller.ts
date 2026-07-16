import { Request, Response } from "express";
import { provinsi, kabupaten, kecamatan } from "daftar-wilayah-indonesia";
import { ok, fail } from "../utils/response";

// Data wilayah resmi Indonesia (Kemendagri) — dipakai buat dropdown bertingkat
// Provinsi -> Kota/Kabupaten -> Kecamatan di semua form alamat (Checkout, Alamat
// Saya, Delivery Area, Tambah/Edit Lokasi). Publik, tidak perlu login, karena
// dipakai juga di halaman checkout customer yang belum tentu sudah login.

// GET /api/regions/provinces
export function listProvinces(_req: Request, res: Response) {
  return ok(res, provinsi());
}

// GET /api/regions/regencies?provinceCode=32
export function listRegencies(req: Request, res: Response) {
  const { provinceCode } = req.query as Record<string, string>;
  if (!provinceCode) return fail(res, "provinceCode wajib diisi", 422);

  // Package-nya kalau kode tidak cocok apapun malah balikin semua data —
  // difilter ulang manual di sini biar aman dari kejutan itu.
  const data = kabupaten(provinceCode).filter((k) => k.kode_provinsi === provinceCode);
  return ok(res, data);
}

// GET /api/regions/districts?regencyCode=3273
export function listDistricts(req: Request, res: Response) {
  const { regencyCode } = req.query as Record<string, string>;
  if (!regencyCode) return fail(res, "regencyCode wajib diisi", 422);

  const data = kecamatan(regencyCode).filter((k) => k.kode_kabupaten === regencyCode);
  return ok(res, data);
}
