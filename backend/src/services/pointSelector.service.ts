import { prisma } from "../config/db";
import { distanceKm } from "../utils/distance";

export interface CartLine {
  variantId: string;
  qty: number;
}

export interface EligiblePoint {
  pointId: string;
  name: string;
  code: string;
  city: string;
  type: "MART" | "POINT";
  distance: number | null;
}

export interface BackOrderOption {
  pointId: string;
  name: string;
  code: string;
  city: string;
  isBackOrder: true;
}

// Cek 1 lokasi tertentu punya stok cukup untuk SEMUA item di keranjang.
export async function pointHasStockForCart(pointId: string, cart: CartLine[]): Promise<boolean> {
  for (const line of cart) {
    const inv = await prisma.inventory.findUnique({
      where: { variantId_pointId: { variantId: line.variantId, pointId } },
    });
    if (!inv || inv.stock < line.qty) return false;
  }
  return true;
}

function sortByDistanceOrCity<T extends { distance: number | null; city: string }>(
  list: T[],
  customerCity?: string | null
): T[] {
  const withDistance = list.filter((p) => p.distance != null);
  const withoutDistance = list.filter((p) => p.distance == null);
  if (withDistance.length > 0) {
    withDistance.sort((a, b) => (a.distance as number) - (b.distance as number));
    return [...withDistance, ...withoutDistance];
  }
  if (customerCity) {
    withoutDistance.sort((a, b) => {
      const aMatch = a.city.toLowerCase() === customerCity.toLowerCase() ? 0 : 1;
      const bMatch = b.city.toLowerCase() === customerCity.toLowerCase() ? 0 : 1;
      return aMatch - bMatch;
    });
  }
  return withoutDistance;
}

// SMART ORDER ROUTING — daftar lokasi customer-facing (Mart & Point) yang
// stoknya cukup untuk keranjang ini, dengan PRIORITAS:
//   1) Semua Point yang stoknya cukup, diurutkan dari yang terdekat.
//   2) Baru semua Mart yang stoknya cukup, diurutkan dari yang terdekat.
// RDH tidak pernah muncul di sini (gudang murni, bukan customer-facing) —
// dipakai belakangan (findBackOrderOption) cuma kalau Point & Mart kosong semua.
export async function listEligiblePoints(
  cart: CartLine[],
  customerLat?: number | null,
  customerLon?: number | null,
  customerCity?: string | null
): Promise<EligiblePoint[]> {
  const points = await prisma.fulfillmentPoint.findMany({ where: { isActive: true, type: { not: "RDH" } } });
  const eligible: EligiblePoint[] = [];

  for (const point of points) {
    const hasStockForAll = await pointHasStockForCart(point.id, cart);
    if (!hasStockForAll) continue;

    const distance =
      customerLat != null && customerLon != null
        ? distanceKm(customerLat, customerLon, point.latitude, point.longitude)
        : null;

    eligible.push({
      pointId: point.id,
      name: point.name,
      code: point.code,
      city: point.city,
      type: point.type as "MART" | "POINT", // aman: query di atas sudah exclude RDH
      distance,
    });
  }

  const pointsOnly = sortByDistanceOrCity(eligible.filter((p) => p.type === "POINT"), customerCity);
  const martsOnly = sortByDistanceOrCity(eligible.filter((p) => p.type === "MART"), customerCity);
  return [...pointsOnly, ...martsOnly];
}

// Fallback terakhir kalau TIDAK ADA Point maupun Mart yang stoknya cukup:
// cari RDH (kota yang sama dulu, baru terdekat) yang stoknya cukup. Order yang
// dipenuhi dari sini ditandai `isBackOrder` (estimasi pengiriman lebih lama,
// karena RDH murni gudang — bukan titik layanan customer biasa).
export async function findBackOrderOption(
  cart: CartLine[],
  customerLat?: number | null,
  customerLon?: number | null,
  customerCity?: string | null
): Promise<BackOrderOption | null> {
  const hubs = await prisma.fulfillmentPoint.findMany({ where: { isActive: true, type: "RDH" } });
  const eligible: { pointId: string; name: string; code: string; city: string; distance: number | null }[] = [];

  for (const hub of hubs) {
    const hasStockForAll = await pointHasStockForCart(hub.id, cart);
    if (!hasStockForAll) continue;
    const distance =
      customerLat != null && customerLon != null
        ? distanceKm(customerLat, customerLon, hub.latitude, hub.longitude)
        : null;
    eligible.push({ pointId: hub.id, name: hub.name, code: hub.code, city: hub.city, distance });
  }

  const sorted = sortByDistanceOrCity(eligible, customerCity);
  if (sorted.length === 0) return null;
  const best = sorted[0];
  return { pointId: best.pointId, name: best.name, code: best.code, city: best.city, isBackOrder: true };
}

// Fallback otomatis kalau customer tidak memilih lokasi sendiri: Point > Mart
// sesuai prioritas Smart Order Routing. TIDAK termasuk fallback RDH/Back Order
// (itu ditangani terpisah oleh createOrder, karena butuh penanda isBackOrder).
export async function selectBestPoint(
  cart: CartLine[],
  customerLat?: number | null,
  customerLon?: number | null,
  customerCity?: string | null
) {
  const eligible = await listEligiblePoints(cart, customerLat, customerLon, customerCity);
  if (eligible.length === 0) {
    throw new Error("Tidak ada Point atau Mart dengan stok mencukupi untuk pesanan ini");
  }
  return eligible[0].pointId;
}
