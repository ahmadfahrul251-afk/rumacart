import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { listEligiblePoints, CartLine } from "../services/pointSelector.service";

// GET /api/points?type=RDH — daftar lokasi aktif. `type` opsional (RDH/MART/POINT)
// dipakai misalnya di form Purchase Order (cuma boleh pilih RDH) & pilih RDH induk.
export async function listPoints(req: Request, res: Response) {
  const { type } = req.query as Record<string, string>;
  const where: any = { isActive: true };
  if (type) where.type = type;
  const points = await prisma.fulfillmentPoint.findMany({
    where,
    include: { parentHub: { select: { id: true, name: true, code: true } } },
    orderBy: { name: "asc" },
  });
  return ok(res, points);
}

// GET /api/points/:id — dipakai halaman Edit Lokasi (butuh data lengkap termasuk
// yang nonaktif, beda dari listPoints yang cuma nampilin yang aktif).
export async function getPoint(req: Request, res: Response) {
  const point = await prisma.fulfillmentPoint.findUnique({
    where: { id: req.params.id },
    include: { parentHub: { select: { id: true, name: true, code: true } } },
  });
  if (!point) return fail(res, "Lokasi tidak ditemukan", 404);
  return ok(res, point);
}

// Validasi aturan Hub and Spoke: RDH tidak boleh punya induk, Mart/Point wajib
// punya induk RDH (dan induknya itu harus benar-benar bertipe RDH).
async function validateHierarchy(type: string, parentHubId?: string | null) {
  if (type === "RDH") {
    return null; // RDH = puncak jaringan di kotanya, tidak punya induk
  }
  if (!parentHubId) {
    throw new Error("Mart/Point wajib punya RDH induk yang mensuplai barangnya");
  }
  const parent = await prisma.fulfillmentPoint.findUnique({ where: { id: parentHubId } });
  if (!parent) throw new Error("RDH induk tidak ditemukan");
  if (parent.type !== "RDH") throw new Error("RDH induk yang dipilih bukan tipe RDH");
  return parentHubId;
}

export async function createPoint(req: Request, res: Response) {
  try {
    const { name, code, address, city, latitude, longitude, phone, serviceRadiusKm, operatingHours } = req.body;
    const type = req.body.type || "POINT";
    if (!name || !code || !address || !city) {
      return fail(res, "name, code, address, city wajib diisi", 422);
    }
    const parentHubId = await validateHierarchy(type, req.body.parentHubId);

    const point = await prisma.fulfillmentPoint.create({
      data: {
        name,
        code,
        type,
        address,
        city,
        latitude: Number(latitude),
        longitude: Number(longitude),
        phone,
        serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : null,
        operatingHours,
        parentHubId,
      },
    });
    return ok(res, point, "Lokasi dibuat", 201);
  } catch (err: any) {
    return fail(res, err.message || "Gagal membuat lokasi", 400);
  }
}

export async function updatePoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    if (body.type || body.parentHubId !== undefined) {
      const existing = await prisma.fulfillmentPoint.findUnique({ where: { id } });
      if (!existing) return fail(res, "Lokasi tidak ditemukan", 404);
      const type = body.type || existing.type;
      const parentHubId = await validateHierarchy(type, body.parentHubId !== undefined ? body.parentHubId : existing.parentHubId);
      body.parentHubId = parentHubId;
    }
    if (body.latitude != null) body.latitude = Number(body.latitude);
    if (body.longitude != null) body.longitude = Number(body.longitude);
    if (body.serviceRadiusKm != null) body.serviceRadiusKm = Number(body.serviceRadiusKm);

    const point = await prisma.fulfillmentPoint.update({ where: { id }, data: body });
    return ok(res, point, "Lokasi diperbarui");
  } catch (err: any) {
    return fail(res, err.message || "Gagal memperbarui lokasi", 400);
  }
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
    include: { inventory: { include: { product: true } }, parentHub: { select: { id: true, name: true } } },
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
      type: p.type,
      city: p.city,
      isActive: p.isActive,
      parentHubName: p.parentHub?.name ?? null,
      claimedProducts,
      totalStockQty,
      stockValue,
      lowStockCount,
      outOfStockCount,
      orderCount: sales?._count?.id ?? 0,
      revenue: sales?._sum?.total ?? 0,
    };
  });

  // Ringkasan jaringan: dipakai stat card di atas tabel (Total Kota/RDH/Mart/Point).
  const summary = {
    totalCities: new Set(points.map((p: any) => p.city)).size,
    totalRDH: points.filter((p: any) => p.type === "RDH").length,
    totalMart: points.filter((p: any) => p.type === "MART").length,
    totalPoint: points.filter((p: any) => p.type === "POINT").length,
  };

  return ok(res, { summary, locations: data });
}
