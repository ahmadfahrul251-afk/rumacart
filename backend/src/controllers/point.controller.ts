import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { listEligiblePoints, CartLine } from "../services/pointSelector.service";

export async function listPoints(_req: Request, res: Response) {
  const points = await prisma.fulfillmentPoint.findMany({ where: { isActive: true } });
  return ok(res, points);
}

export async function createPoint(req: Request, res: Response) {
  const { name, code, address, city, latitude, longitude, phone } = req.body;
  if (!name || !code || !address || !city) {
    return fail(res, "name, code, address, city wajib diisi", 422);
  }
  const point = await prisma.fulfillmentPoint.create({
    data: { name, code, address, city, latitude: Number(latitude), longitude: Number(longitude), phone },
  });
  return ok(res, point, "Point dibuat", 201);
}

export async function updatePoint(req: Request, res: Response) {
  const { id } = req.params;
  const point = await prisma.fulfillmentPoint.update({ where: { id }, data: req.body });
  return ok(res, point, "Point diperbarui");
}

// POST /api/points/eligible  { items: [{productId, qty}], addressId? }
// Dipakai halaman checkout: customer pilih sendiri Point tujuan dari daftar
// Point yang stoknya cukup untuk keranjangnya, diurutkan dari yang terdekat.
export async function eligiblePoints(req: Request, res: Response) {
  const { items, addressId } = req.body as { items: CartLine[]; addressId?: string };
  if (!items || !items.length) return fail(res, "Keranjang kosong", 422);

  let lat: number | null = null;
  let lon: number | null = null;
  let city: string | null = null;
  if (addressId) {
    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (address) {
      lat = address.latitude;
      lon = address.longitude;
      city = address.city;
    }
  }

  const points = await listEligiblePoints(items, lat, lon, city);
  return ok(res, points);
}

// GET /api/points/monitoring?from=&to=  — khusus Admin Pusat.
// Ringkasan tiap Point: jumlah produk yang sudah diklaim + nilai stoknya,
// dan ringkasan penjualan (jumlah order & omzet) dalam rentang tanggal.
export async function pointsMonitoring(req: Request, res: Response) {
  const { from, to } = req.query as Record<string, string>;

  const points = await prisma.fulfillmentPoint.findMany({
    include: { inventory: { include: { product: true } } },
    orderBy: { name: "asc" },
  });

  const orderWhere: any = { status: { not: "CANCELLED" } };
  if (from || to) {
    orderWhere.createdAt = {};
    if (from) orderWhere.createdAt.gte = new Date(from);
    if (to) orderWhere.createdAt.lte = new Date(`${to}T23:59:59`);
  }
  const salesByPoint = await prisma.order.groupBy({
    by: ["pointId"],
    where: orderWhere,
    _count: { id: true },
    _sum: { total: true },
  });
  const salesMap = new Map<string, any>(salesByPoint.map((s: any) => [s.pointId, s]));

  const data = points.map((p: any) => {
    const claimedProducts = p.inventory.length;
    const totalStockQty = p.inventory.reduce((sum: number, inv: any) => sum + inv.stock, 0);
    const stockValue = p.inventory.reduce((sum: number, inv: any) => sum + inv.stock * inv.product.costPrice, 0);
    const lowStockCount = p.inventory.filter((inv: any) => inv.stock > 0 && inv.stock <= inv.minStock).length;
    const outOfStockCount = p.inventory.filter((inv: any) => inv.stock === 0).length;
    const sales = salesMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      city: p.city,
      isActive: p.isActive,
      claimedProducts,
      totalStockQty,
      stockValue,
      lowStockCount,
      outOfStockCount,
      orderCount: sales?._count?.id ?? 0,
      revenue: sales?._sum?.total ?? 0,
    };
  });

  return ok(res, data);
}
