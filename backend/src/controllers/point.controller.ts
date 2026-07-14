import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { listEligiblePoints, findBackOrderOption, CartLine } from "../services/pointSelector.service";
import { distanceKm } from "../utils/distance";

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

// GET /api/points/nearby?addressId=&lat=&lon=&city= — daftar Point/Mart aktif buat
// customer BROWSE ("Semua Point"), diurutkan dari yang terdekat kalau ada info lokasi
// (alamat tersimpan customer yang login, atau lat/lon langsung dari browser). RDH
// tidak pernah muncul (gudang murni, bukan customer-facing). PUBLIK, tanpa login.
export async function listCustomerPoints(req: Request, res: Response) {
  const { addressId, lat: latQuery, lon: lonQuery, city: cityQuery } = req.query as Record<string, string>;

  let lat: number | null = latQuery ? Number(latQuery) : null;
  let lon: number | null = lonQuery ? Number(lonQuery) : null;
  let city: string | null = cityQuery || null;

  if (addressId) {
    const address = await prisma.address.findUnique({ where: { id: addressId } });
    if (address) {
      lat = address.latitude;
      lon = address.longitude;
      city = address.city;
    }
  }

  const points = await prisma.fulfillmentPoint.findMany({
    where: { isActive: true, type: { not: "RDH" } },
    orderBy: { name: "asc" },
  });

  const withDistance = points.map((p: any) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    city: p.city,
    address: p.address,
    distance: lat != null && lon != null ? distanceKm(lat, lon, p.latitude, p.longitude) : null,
  }));

  withDistance.sort((a: any, b: any) => {
    if (a.distance != null && b.distance != null) return a.distance - b.distance;
    if (a.distance != null) return -1;
    if (b.distance != null) return 1;
    if (city) {
      const aMatch = a.city.toLowerCase() === city!.toLowerCase() ? 0 : 1;
      const bMatch = b.city.toLowerCase() === city!.toLowerCase() ? 0 : 1;
      return aMatch - bMatch;
    }
    return 0;
  });

  return ok(res, withDistance);
}

// GET /api/points/:id/public — info dasar 1 Point/Mart buat halaman detail customer.
// PUBLIK (tanpa login), cuma expose field yang aman ditampilkan ke publik.
export async function getPointPublic(req: Request, res: Response) {
  const point = await prisma.fulfillmentPoint.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      city: true,
      address: true,
      phone: true,
      operatingHours: true,
      isActive: true,
      latitude: true,
      longitude: true,
    },
  });
  if (!point || !point.isActive || point.type === "RDH") return fail(res, "Point tidak ditemukan", 404);
  return ok(res, point);
}

// GET /api/points/:id/products?search=&page=&limit= — produk yang READY (stock>0)
// di Point ini, dipakai halaman "masuk ke Point" customer supaya beli langsung dari
// Point tersebut (skip modal pilih Point). PUBLIK.
export async function getPointProducts(req: Request, res: Response) {
  const { id } = req.params;
  const { search = "", page = "1", limit = "20" } = req.query as Record<string, string>;
  const take = Math.min(Number(limit) || 20, 100);
  const skip = (Number(page) - 1) * take;

  const point = await prisma.fulfillmentPoint.findUnique({ where: { id } });
  if (!point || !point.isActive) return fail(res, "Point tidak ditemukan", 404);

  const where: any = {
    isActive: true,
    name: { contains: search, mode: "insensitive" },
    inventory: { some: { pointId: id, stock: { gt: 0 } } },
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, inventory: { where: { pointId: id } } },
      skip,
      take,
      orderBy: { name: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  const data = items.map((p: any) => ({ ...p, totalStock: p.inventory[0]?.stock ?? 0 }));
  return ok(res, { items: data, total, page: Number(page), totalPages: Math.ceil(total / take), point });
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
// Dipakai halaman checkout: customer pilih sendiri lokasi tujuan dari daftar
// yang stoknya cukup untuk keranjangnya. Smart Order Routing: Point diprioritaskan
// dulu, baru Mart, keduanya diurutkan dari yang terdekat. Kalau Point & Mart
// kosong semua, tawarkan 1 opsi Back Order dari RDH terdekat yang stoknya cukup.
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
  if (points.length === 0) {
    const backOrder = await findBackOrderOption(items, lat, lon, city);
    if (backOrder) return ok(res, [backOrder]);
  }
  return ok(res, points);
}

// GET /api/points/monitoring?from=&to=  — khusus Admin Pusat.
// Ringkasan tiap Point: jumlah produk yang sudah diklaim + nilai stoknya,
// ringkasan penjualan (jumlah order & omzet), dan profit (dari Cashflow) dalam
// rentang tanggal. Plus ringkasan jaringan skala nasional: total customer/kurir,
// produk terlaris, dan penjualan per kota (substitusi sederhana untuk peta
// sebaran, karena stack ini belum pakai library mapping).
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
  const cashflowWhere: any = {};
  if (from || to) {
    cashflowWhere.createdAt = {};
    if (from) cashflowWhere.createdAt.gte = new Date(from);
    if (to) cashflowWhere.createdAt.lte = new Date(`${to}T23:59:59`);
  }

  const [salesByPoint, profitByPoint, totalCustomers, totalKurir, topProductsRaw] = await Promise.all([
    prisma.order.groupBy({ by: ["pointId"], where: orderWhere, _count: { id: true }, _sum: { total: true } }),
    prisma.cashflow.groupBy({ by: ["pointId"], where: cashflowWhere, _sum: { profitAmount: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "KURIR" } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: orderWhere },
      _sum: { qty: true, subtotal: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    }),
  ]);
  const salesMap = new Map<string, any>(salesByPoint.map((s: any) => [s.pointId, s]));
  const profitMap = new Map<string, number>(profitByPoint.map((c: any) => [c.pointId, c._sum.profitAmount || 0]));

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
      profit: profitMap.get(p.id) ?? 0,
    };
  });

  // Penjualan per kota — dihitung dari agregat per lokasi di atas (bukan query
  // baru) supaya tetap konsisten dengan angka per-lokasi yang sama.
  const cityMap = new Map<string, { city: string; orderCount: number; revenue: number }>();
  for (const d of data) {
    const cur = cityMap.get(d.city) || { city: d.city, orderCount: 0, revenue: 0 };
    cur.orderCount += d.orderCount;
    cur.revenue += d.revenue;
    cityMap.set(d.city, cur);
  }
  const salesByCity = Array.from(cityMap.values()).sort((a, b) => b.revenue - a.revenue);

  const productIds = topProductsRaw.map((t: any) => t.productId);
  const products = productIds.length ? await prisma.product.findMany({ where: { id: { in: productIds } } }) : [];
  const productMap = new Map<string, any>(products.map((pr: any) => [pr.id, pr]));
  const topProducts = topProductsRaw.map((t: any) => ({
    productId: t.productId,
    name: productMap.get(t.productId)?.name ?? "-",
    qtySold: t._sum.qty ?? 0,
    revenue: t._sum.subtotal ?? 0,
  }));

  // Ringkasan jaringan: dipakai stat card di atas tabel (Total Kota/RDH/Mart/Point/Customer/Kurir).
  const summary = {
    totalCities: new Set(points.map((p: any) => p.city)).size,
    totalRDH: points.filter((p: any) => p.type === "RDH").length,
    totalMart: points.filter((p: any) => p.type === "MART").length,
    totalPoint: points.filter((p: any) => p.type === "POINT").length,
    totalCustomers,
    totalKurir,
  };

  return ok(res, { summary, locations: data, topProducts, salesByCity });
}
