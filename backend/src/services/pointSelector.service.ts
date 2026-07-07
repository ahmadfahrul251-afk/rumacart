import { prisma } from "../config/db";
import { distanceKm } from "../utils/distance";

export interface CartLine {
  productId: string;
  qty: number;
}

interface PointCandidate {
  pointId: string;
  distance: number | null;
}

// INI FITUR UTAMA RUMACART: memilih Fulfillment Point yang
//  1) punya stok cukup untuk SEMUA item di keranjang, dan
//  2) paling dekat dengan alamat customer (kalau lat/long tersedia).
//
// Kalau alamat tidak punya koordinat, fallback: cocokkan nama kota,
// lalu kalau masih tidak ada, pilih Point dengan total stok terbanyak.
export async function selectBestPoint(
  cart: CartLine[],
  customerLat?: number | null,
  customerLon?: number | null,
  customerCity?: string | null
) {
  const points = await prisma.fulfillmentPoint.findMany({ where: { isActive: true } });
  if (points.length === 0) throw new Error("Belum ada Fulfillment Point aktif");

  const eligible: PointCandidate[] = [];

  for (const point of points) {
    const hasStockForAll = await pointHasStockForCart(point.id, cart);
    if (!hasStockForAll) continue;

    const distance =
      customerLat != null && customerLon != null
        ? distanceKm(customerLat, customerLon, point.latitude, point.longitude)
        : null;

    eligible.push({ pointId: point.id, distance });
  }

  if (eligible.length === 0) {
    throw new Error("Tidak ada Point dengan stok mencukupi untuk pesanan ini");
  }

  // Kalau ada koordinat, urutkan berdasarkan jarak terdekat.
  const withDistance = eligible.filter((p) => p.distance != null);
  if (withDistance.length > 0) {
    withDistance.sort((a, b) => (a.distance as number) - (b.distance as number));
    return withDistance[0].pointId;
  }

  // Fallback: cocokkan kota.
  if (customerCity) {
    const cityMatch = points.find(
      (p: any) => eligible.some((e) => e.pointId === p.id) && p.city.toLowerCase() === customerCity!.toLowerCase()
    );
    if (cityMatch) return cityMatch.id;
  }

  // Fallback terakhir: Point pertama yang eligible.
  return eligible[0].pointId;
}

async function pointHasStockForCart(pointId: string, cart: CartLine[]): Promise<boolean> {
  for (const line of cart) {
    const inv = await prisma.inventory.findUnique({
      where: { productId_pointId: { productId: line.productId, pointId } },
    });
    if (!inv || inv.stock < line.qty) return false;
  }
  return true;
}
