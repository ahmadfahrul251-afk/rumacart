import { prisma } from "../config/db";
import { distanceKm } from "../utils/distance";

export interface CartLine {
  productId: string;
  qty: number;
}

export interface EligiblePoint {
  pointId: string;
  name: string;
  code: string;
  city: string;
  distance: number | null;
}

// Cek 1 Point tertentu punya stok cukup untuk SEMUA item di keranjang.
export async function pointHasStockForCart(pointId: string, cart: CartLine[]): Promise<boolean> {
  for (const line of cart) {
    const inv = await prisma.inventory.findUnique({
      where: { productId_pointId: { productId: line.productId, pointId } },
    });
    if (!inv || inv.stock < line.qty) return false;
  }
  return true;
}

// Daftar semua Point yang stoknya cukup untuk keranjang ini, diurutkan dari
// yang paling dekat (kalau ada koordinat customer). Dipakai untuk:
//  1) checkout customer memilih sendiri Point-nya (GET/POST /points/eligible)
//  2) fallback otomatis di selectBestPoint kalau customer tidak memilih.
export async function listEligiblePoints(
  cart: CartLine[],
  customerLat?: number | null,
  customerLon?: number | null,
  customerCity?: string | null
): Promise<EligiblePoint[]> {
  const points = await prisma.fulfillmentPoint.findMany({ where: { isActive: true } });
  const eligible: EligiblePoint[] = [];

  for (const point of points) {
    const hasStockForAll = await pointHasStockForCart(point.id, cart);
    if (!hasStockForAll) continue;

    const distance =
      customerLat != null && customerLon != null
        ? distanceKm(customerLat, customerLon, point.latitude, point.longitude)
        : null;

    eligible.push({ pointId: point.id, name: point.name, code: point.code, city: point.city, distance });
  }

  const withDistance = eligible.filter((p) => p.distance != null);
  const withoutDistance = eligible.filter((p) => p.distance == null);

  if (withDistance.length > 0) {
    withDistance.sort((a, b) => (a.distance as number) - (b.distance as number));
    return [...withDistance, ...withoutDistance];
  }

  // Tidak ada koordinat: kalau kota customer cocok, taruh di depan.
  if (customerCity) {
    withoutDistance.sort((a, b) => {
      const aMatch = a.city.toLowerCase() === customerCity.toLowerCase() ? 0 : 1;
      const bMatch = b.city.toLowerCase() === customerCity.toLowerCase() ? 0 : 1;
      return aMatch - bMatch;
    });
  }
  return withoutDistance;
}

// INI FITUR UTAMA RUMACART (fallback otomatis): kalau customer tidak memilih
// Point sendiri, sistem pilih Point terdekat/tercocok yang stoknya cukup.
export async function selectBestPoint(
  cart: CartLine[],
  customerLat?: number | null,
  customerLon?: number | null,
  customerCity?: string | null
) {
  const eligible = await listEligiblePoints(cart, customerLat, customerLon, customerCity);
  if (eligible.length === 0) {
    throw new Error("Tidak ada Point dengan stok mencukupi untuk pesanan ini");
  }
  return eligible[0].pointId;
}
