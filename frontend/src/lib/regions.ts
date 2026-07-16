import { api } from "./api";
import { Province, Regency, District } from "@/types";

// Cache in-memory sederhana (per sesi browser) supaya tiap form alamat yang
// dibuka tidak fetch ulang data yang sama — provinsi cuma 34 baris jadi cukup
// sekali fetch untuk seluruh halaman, kota/kecamatan di-cache per kode induknya.
let provincesCache: Province[] | null = null;
let provincesPromise: Promise<Province[]> | null = null;
const regenciesCache = new Map<string, Regency[]>();
const districtsCache = new Map<string, District[]>();

export async function fetchProvinces(): Promise<Province[]> {
  if (provincesCache) return provincesCache;
  if (!provincesPromise) {
    provincesPromise = api.get<Province[]>("/regions/provinces").then((data) => {
      provincesCache = data;
      return data;
    });
  }
  return provincesPromise;
}

export async function fetchRegencies(provinceCode: string): Promise<Regency[]> {
  if (!provinceCode) return [];
  const cached = regenciesCache.get(provinceCode);
  if (cached) return cached;
  const data = await api.get<Regency[]>(`/regions/regencies?provinceCode=${encodeURIComponent(provinceCode)}`);
  regenciesCache.set(provinceCode, data);
  return data;
}

export async function fetchDistricts(regencyCode: string): Promise<District[]> {
  if (!regencyCode) return [];
  const cached = districtsCache.get(regencyCode);
  if (cached) return cached;
  const data = await api.get<District[]>(`/regions/districts?regencyCode=${encodeURIComponent(regencyCode)}`);
  districtsCache.set(regencyCode, data);
  return data;
}

// Cari entri berdasarkan nama (case-insensitive, abaikan spasi di ujung) —
// dipakai buat "reverse lookup" waktu buka form edit alamat lama yang cuma
// nyimpen nama teks, bukan kode wilayah.
export function findByName<T extends { nama: string }>(list: T[], name: string | null | undefined): T | undefined {
  if (!name) return undefined;
  const target = name.trim().toLowerCase();
  return list.find((item) => item.nama.trim().toLowerCase() === target);
}
