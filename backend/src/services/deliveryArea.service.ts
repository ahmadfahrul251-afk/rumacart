import { prisma } from "../config/db";

export interface DeliveryQuote {
  available: boolean;
  cost: number;
}

// Dipakai checkout (order.service.ts) & endpoint quote: cek apakah 1 Point
// melayani pengiriman (DELIVERY) ke kecamatan tertentu, dan berapa biayanya.
// Kalau kecamatan customer kosong atau tidak terdaftar di DeliveryArea Point
// ini, dianggap TIDAK melayani — customer tetap bisa PICKUP langsung ke Point.
export async function getDeliveryCost(
  pointId: string,
  kecamatan?: string | null,
  city?: string | null
): Promise<DeliveryQuote> {
  if (!kecamatan) return { available: false, cost: 0 };

  const area = await prisma.deliveryArea.findFirst({
    where: {
      pointId,
      isActive: true,
      kecamatan: { equals: kecamatan, mode: "insensitive" },
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    },
  });

  return area ? { available: true, cost: area.cost } : { available: false, cost: 0 };
}
