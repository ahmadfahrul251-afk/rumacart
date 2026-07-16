"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Address, EligiblePoint } from "@/types";
import { formatRupiah } from "@/lib/utils";

interface Props {
  productName: string; // label ditampilkan di modal — biasanya "Nama Produk (Nama Varian)"
  variantId: string;
  qty: number;
  onConfirm: (point: { pointId: string; name: string; code: string; price?: number | null }) => void;
  onClose: () => void;
}

// Modal pilih Point/Pickup Point untuk 1 varian produk — dipakai saat customer
// klik "Beli Sekarang" di kartu produk atau halaman detail. Daftar Point-nya
// pakai endpoint yang sama dengan Smart Order Routing di checkout
// (/points/eligible): Point diprioritaskan dulu (lalu Mart), diurutkan dari
// yang terdekat dengan alamat utama customer. Kalau semua Point/Mart kosong,
// tetap ditawarkan Back Order dari RDH.
export function PointPickerModal({ productName, variantId, qty, onConfirm, onClose }: Props) {
  const { user } = useAuth();
  const [points, setPoints] = useState<EligiblePoint[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPoints(null);
      setError("");
      let addressId: string | undefined;
      if (user) {
        try {
          const addresses = await api.get<Address[]>("/addresses");
          addressId = (addresses.find((a) => a.isDefault) || addresses[0])?.id;
        } catch {
          // biarkan addressId undefined — daftar Point tetap muncul, cuma tidak diurutkan jarak
        }
      }
      try {
        const res = await api.post<EligiblePoint[]>("/points/eligible", {
          items: [{ variantId, qty }],
          addressId,
        });
        if (cancelled) return;
        setPoints(res);
        if (res.length > 0) setSelected(res[0].pointId);
      } catch (err: any) {
        if (cancelled) return;
        setPoints([]);
        setError(err.message);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId, qty]);

  function handleConfirm() {
    const point = points?.find((p) => p.pointId === selected);
    if (!point) return;
    onConfirm({ pointId: point.pointId, name: point.name, code: point.code, price: point.price });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[85vh] w-full max-w-md overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-semibold">Pilih Point Belanja</p>
            <p className="text-xs text-ink/50">{productName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {points === null && <p className="py-6 text-center text-sm text-ink/50">Mencari Point yang tersedia...</p>}
        {points?.length === 0 && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error || "Tidak ada Point dengan stok mencukupi untuk produk ini."}
          </p>
        )}
        {points && points.length > 0 && (
          <div className="space-y-2">
            {points.map((p, idx) => (
              <label
                key={p.pointId}
                className="flex cursor-pointer items-start gap-2 rounded-xl border border-black/10 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-light"
              >
                <input type="radio" name="pointpick" checked={selected === p.pointId} onChange={() => setSelected(p.pointId)} className="mt-1" />
                <div className="flex-1 text-sm">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium">
                    {p.name}
                    {idx === 0 && !p.isBackOrder && (
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-medium text-primary">Terdekat</span>
                    )}
                    {p.isBackOrder && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Back Order — dari Gudang Pusat
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-1 text-ink/60">
                    <MapPin size={12} /> {p.city}
                    {p.distance != null && <span> · {p.distance.toFixed(1)} km</span>}
                  </p>
                  {p.price != null && (
                    <p className="mt-0.5 font-semibold text-primary">
                      {formatRupiah(p.price)}
                      {p.originalPrice != null && p.originalPrice > p.price && (
                        <span className="ml-1.5 text-xs font-normal text-ink/40 line-through">
                          {formatRupiah(p.originalPrice)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="btn-primary mt-4 w-full disabled:opacity-40"
        >
          Konfirmasi
        </button>
      </div>
    </div>
  );
}
