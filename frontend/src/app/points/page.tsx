"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Store, ShoppingBag, Navigation } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Address, NearbyPoint, LocationType } from "@/types";

const TYPE_LABEL: Record<LocationType, string> = { RDH: "RDH", MART: "Mart", POINT: "Point" };
const TYPE_ICON: Record<LocationType, any> = { RDH: Store, MART: Store, POINT: ShoppingBag };

export default function PointsListPage() {
  const { user } = useAuth();
  const [points, setPoints] = useState<NearbyPoint[] | null>(null);

  useEffect(() => {
    async function load() {
      setPoints(null);
      const params = new URLSearchParams();

      // Prioritas cari lokasi customer: alamat utama (kalau login) → geolocation
      // browser (kalau diizinkan) → tanpa lokasi (daftar tetap muncul, cuma tidak
      // diurutkan jarak).
      if (user) {
        try {
          const addresses = await api.get<Address[]>("/addresses");
          const def = addresses.find((a) => a.isDefault) || addresses[0];
          if (def) params.set("addressId", def.id);
        } catch {
          // lanjut tanpa addressId
        }
      }

      if (!params.has("addressId") && typeof window !== "undefined" && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              params.set("lat", String(pos.coords.latitude));
              params.set("lon", String(pos.coords.longitude));
              resolve();
            },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      }

      const qs = params.toString() ? `?${params.toString()}` : "";
      api
        .get<NearbyPoint[]>(`/points/nearby${qs}`)
        .then(setPoints)
        .catch(() => setPoints([]));
    }
    load();
  }, [user]);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-2xl font-bold">Semua Point & Mart</h1>
        <p className="mb-6 text-sm text-ink/60">
          Pilih Point/Mart buat lihat produk apa saja yang ready di situ — beli langsung dari lokasi itu.
        </p>

        {points === null && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        )}

        {points?.length === 0 && (
          <EmptyState icon="🏬" title="Belum ada Point/Mart aktif" description="Coba lagi nanti." />
        )}

        {points && points.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {points.map((p, idx) => {
              const Icon = TYPE_ICON[p.type];
              return (
                <Link
                  key={p.id}
                  href={`/points/${p.id}`}
                  className="card flex flex-col gap-2 transition hover:shadow-soft"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-light text-primary">
                      <Icon size={18} />
                    </span>
                    {idx === 0 && p.distance != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Navigation size={10} /> Terdekat
                      </span>
                    )}
                  </div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-ink/40">{TYPE_LABEL[p.type]} · {p.code}</p>
                  <p className="flex items-center gap-1 text-sm text-ink/60">
                    <MapPin size={13} /> {p.city}
                    {p.distance != null && <span> · {p.distance.toFixed(1)} km</span>}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
