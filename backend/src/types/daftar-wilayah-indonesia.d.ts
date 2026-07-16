// Package "daftar-wilayah-indonesia" tidak menyediakan tipe TypeScript sendiri,
// jadi kita deklarasikan manual sesuai bentuk data aslinya (semua field string).
declare module "daftar-wilayah-indonesia" {
  export interface Provinsi {
    kode: string;
    nama: string;
  }

  export interface Kabupaten {
    kode: string;
    kode_provinsi: string;
    nama: string;
  }

  export interface Kecamatan {
    kode: string;
    kode_kabupaten: string;
    nama: string;
  }

  export function provinsi(): Provinsi[];
  export function kabupaten(kodeProvinsi?: string): Kabupaten[];
  export function kecamatan(kodeKabupaten?: string): Kecamatan[];
  export function desa(kodeKecamatan?: string): { kode: string; kode_kecamatan: string; nama: string }[];
}
