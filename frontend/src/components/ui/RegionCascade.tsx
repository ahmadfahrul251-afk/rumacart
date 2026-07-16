"use client";

import { useEffect, useRef, useState } from "react";
import { Province, Regency, District } from "@/types";
import { fetchProvinces, fetchRegencies, fetchDistricts, findByName } from "@/lib/regions";

interface RegionCascadeValue {
  province: string;
  city: string;
  kecamatan: string;
}

interface RegionCascadeProps {
  province: string;
  city: string;
  kecamatan?: string;
  onChange: (next: RegionCascadeValue) => void;
  // Sebagian form (mis. Tambah/Edit Lokasi RDH/Mart/Point) cuma butuh
  // Provinsi->Kota (provinsi cuma alat bantu filter, tidak disimpan di
  // backend), jadi kecamatan bisa disembunyikan.
  showKecamatan?: boolean;
  required?: boolean;
}

const selectClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-accent disabled:text-ink/40";

// Dropdown bertingkat Provinsi -> Kota/Kabupaten -> Kecamatan pakai data
// resmi wilayah Indonesia. Data disimpan sebagai NAMA (bukan kode) di
// form/backend, konsisten dengan field Address/DeliveryArea/FulfillmentPoint
// yang sudah ada — kode cuma dipakai internal buat nge-cascade fetch-nya.
//
// PENTING: kalau dipakai untuk beberapa data berbeda secara bergantian dalam
// 1 halaman (misalnya form edit yang muncul untuk baris berbeda-beda), kasih
// prop `key` yang unik per data (mis. `key={address.id}`) supaya komponennya
// remount dan prefill ulang dari awal — bukan cuma reuse instance lama.
export function RegionCascade({
  province,
  city,
  kecamatan = "",
  onChange,
  showKecamatan = true,
  required,
}: RegionCascadeProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [regencies, setRegencies] = useState<Regency[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [provinceCode, setProvinceCode] = useState("");
  const [regencyCode, setRegencyCode] = useState("");
  const resolvedInitial = useRef(false);

  useEffect(() => {
    fetchProvinces().then(setProvinces);
  }, []);

  // Prefill sekali dari nama yang sudah ada (mode edit) begitu daftar provinsi
  // selesai dimuat — cari kode-nya lewat nama, lalu susul fetch kota & kecamatan.
  useEffect(() => {
    if (resolvedInitial.current || provinces.length === 0) return;
    resolvedInitial.current = true;

    const matchedProvince = findByName(provinces, province);
    if (!matchedProvince) return;
    setProvinceCode(matchedProvince.kode);

    fetchRegencies(matchedProvince.kode).then((regs) => {
      setRegencies(regs);
      const matchedRegency = findByName(regs, city);
      if (!matchedRegency) return;
      setRegencyCode(matchedRegency.kode);
      if (showKecamatan) {
        fetchDistricts(matchedRegency.kode).then(setDistricts);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinces]);

  function handleProvinceChange(kode: string) {
    setProvinceCode(kode);
    setRegencyCode("");
    setRegencies([]);
    setDistricts([]);
    const matched = provinces.find((p) => p.kode === kode);
    onChange({ province: matched?.nama || "", city: "", kecamatan: "" });
    if (kode) fetchRegencies(kode).then(setRegencies);
  }

  function handleRegencyChange(kode: string) {
    setRegencyCode(kode);
    setDistricts([]);
    const matched = regencies.find((r) => r.kode === kode);
    onChange({ province, city: matched?.nama || "", kecamatan: "" });
    if (kode && showKecamatan) fetchDistricts(kode).then(setDistricts);
  }

  function handleDistrictChange(kode: string) {
    const matched = districts.find((d) => d.kode === kode);
    onChange({ province, city, kecamatan: matched?.nama || "" });
  }

  const currentDistrictCode = findByName(districts, kecamatan)?.kode || "";

  return (
    <div className={`grid gap-3 ${showKecamatan ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      <div>
        <label className="mb-1 block text-sm font-medium">Provinsi{required ? " *" : ""}</label>
        <select className={selectClass} value={provinceCode} onChange={(e) => handleProvinceChange(e.target.value)}>
          <option value="">Pilih Provinsi</option>
          {provinces.map((p) => (
            <option key={p.kode} value={p.kode}>{p.nama}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Kota/Kabupaten{required ? " *" : ""}</label>
        <select
          className={selectClass}
          value={regencyCode}
          onChange={(e) => handleRegencyChange(e.target.value)}
          disabled={!provinceCode}
        >
          <option value="">{provinceCode ? "Pilih Kota/Kabupaten" : "Pilih provinsi dulu"}</option>
          {regencies.map((r) => (
            <option key={r.kode} value={r.kode}>{r.nama}</option>
          ))}
        </select>
      </div>
      {showKecamatan && (
        <div>
          <label className="mb-1 block text-sm font-medium">Kecamatan{required ? " *" : ""}</label>
          <select
            className={selectClass}
            value={currentDistrictCode}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={!regencyCode}
          >
            <option value="">{regencyCode ? "Pilih Kecamatan" : "Pilih kota dulu"}</option>
            {districts.map((d) => (
              <option key={d.kode} value={d.kode}>{d.nama}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
