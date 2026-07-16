import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { scopedPointId, resolveWritePointId, canAccessPoint } from "../utils/pointScope";
import { checkAndCreateRestockRequest } from "../services/restockRequest.service";

// GET /api/inventory?pointId=xxx — daftar stok varian produk di satu Point (atau semua).
// Admin Point otomatis terkunci ke Point-nya sendiri, tidak peduli query yang dikirim.
export async function listInventory(req: Request, res: Response) {
  const pointId = scopedPointId(req);
  const where = pointId ? { pointId } : {};
  const inventory = await prisma.inventory.findMany({
    where,
    include: { variant: { include: { product: true } }, point: true },
    orderBy: { updatedAt: "desc" },
  });
  return ok(res, inventory);
}

// GET /api/inventory/stats — dipakai Dashboard Inventory
export async function inventoryStats(req: Request, res: Response) {
  const pointId = scopedPointId(req);
  const invWhere = pointId ? { pointId } : {};
  const [totalProducts, totalSku, outOfStock, allInventory] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.productVariant.count({ where: { isActive: true } }), // Round 18: 1 varian = 1 SKU sungguhan
    prisma.inventory.count({ where: { ...invWhere, stock: 0 } }),
    prisma.inventory.findMany({ where: invWhere, include: { variant: true } }),
  ]);

  // Hitung manual "stok menipis" (stock > 0 tapi <= minStock) karena Prisma
  // belum mendukung perbandingan antar kolom secara langsung di semua versi.
  const lowStockCount = allInventory.filter((i: any) => i.stock > 0 && i.stock <= i.minStock).length;
  // Nilai inventaris dihitung dari basePrice (harga dasar/modal) tiap baris —
  // basePrice bisa null kalau RDH belum pernah set harga (belum terima PO/klaim manual).
  const inventoryValue = allInventory.reduce((sum: number, i: any) => sum + i.stock * (i.basePrice ?? 0), 0);

  return ok(res, {
    totalProducts,
    totalSku,
    lowStock: lowStockCount,
    outOfStock,
    inventoryValue,
  });
}

// POST /api/inventory/stock-in  { variantId, pointId, qty, note }
// Admin Point: pointId dari body diabaikan, dipaksa pakai Point yang dia kelola.
export async function stockIn(req: Request, res: Response) {
  const { variantId, qty, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!variantId || !pointId || !qty || qty <= 0) return fail(res, "Data tidak lengkap", 422);

  const inventory = await upsertInventory(variantId, pointId, qty);
  await prisma.inventoryHistory.create({
    data: { inventoryId: inventory.id, type: "STOCK_IN", qty, note, createdById: req.user?.userId },
  });
  return ok(res, inventory, "Stok masuk dicatat");
}

// POST /api/inventory/stock-out  { variantId, pointId, qty, note }
export async function stockOut(req: Request, res: Response) {
  const { variantId, qty, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!variantId || !pointId || !qty || qty <= 0) return fail(res, "Data tidak lengkap", 422);

  const existing = await prisma.inventory.findUnique({ where: { variantId_pointId: { variantId, pointId } } });
  if (!existing || existing.stock < qty) return fail(res, "Stok tidak cukup", 400);

  const inventory = await upsertInventory(variantId, pointId, -qty);
  await prisma.inventoryHistory.create({
    data: { inventoryId: inventory.id, type: "STOCK_OUT", qty, note, createdById: req.user?.userId },
  });
  await checkAndCreateRestockRequest(variantId, pointId).catch(() => {});
  return ok(res, inventory, "Stok keluar dicatat");
}

// POST /api/inventory/transfer  { variantId, fromPointId, toPointId, qty, note }
export async function transferStock(req: Request, res: Response) {
  const { variantId, fromPointId, toPointId, qty, note } = req.body;
  if (!variantId || !fromPointId || !toPointId || !qty || qty <= 0) {
    return fail(res, "Data tidak lengkap", 422);
  }
  if (fromPointId === toPointId) return fail(res, "Point asal dan tujuan tidak boleh sama", 422);

  const source = await prisma.inventory.findUnique({
    where: { variantId_pointId: { variantId, pointId: fromPointId } },
  });
  if (!source || source.stock < qty) return fail(res, "Stok di Point asal tidak cukup", 400);

  const [fromInv, toInv] = await prisma.$transaction([
    prisma.inventory.update({
      where: { variantId_pointId: { variantId, pointId: fromPointId } },
      data: { stock: { decrement: qty } },
    }),
    prisma.inventory.upsert({
      where: { variantId_pointId: { variantId, pointId: toPointId } },
      update: { stock: { increment: qty } },
      create: { variantId, pointId: toPointId, stock: qty },
    }),
  ]);

  await prisma.inventoryHistory.createMany({
    data: [
      { inventoryId: fromInv.id, type: "TRANSFER_OUT", qty, note, createdById: req.user?.userId },
      { inventoryId: toInv.id, type: "TRANSFER_IN", qty, note, createdById: req.user?.userId },
    ],
  });
  await checkAndCreateRestockRequest(variantId, fromPointId).catch(() => {});

  return ok(res, { fromInv, toInv }, "Transfer stok berhasil");
}

// POST /api/inventory/adjustment  { variantId, pointId, newStock, note }
// Dipakai untuk hasil Stock Opname (stok fisik vs sistem berbeda).
export async function adjustment(req: Request, res: Response) {
  const { variantId, newStock, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!variantId || !pointId || newStock == null) return fail(res, "Data tidak lengkap", 422);

  const existing = await prisma.inventory.upsert({
    where: { variantId_pointId: { variantId, pointId } },
    update: {},
    create: { variantId, pointId, stock: 0 },
  });
  const diff = Number(newStock) - existing.stock;

  const inventory = await prisma.inventory.update({
    where: { variantId_pointId: { variantId, pointId } },
    data: { stock: Number(newStock) },
  });
  await prisma.inventoryHistory.create({
    data: {
      inventoryId: inventory.id,
      type: "ADJUSTMENT",
      qty: Math.abs(diff),
      note: note || `Adjustment stock opname (${diff >= 0 ? "+" : ""}${diff})`,
      createdById: req.user?.userId,
    },
  });
  if (diff < 0) await checkAndCreateRestockRequest(variantId, pointId).catch(() => {});
  return ok(res, inventory, "Stok disesuaikan");
}

// POST /api/inventory/claim  { variantId, pointId?, qty?, basePrice?, sellPrice?, discountPrice? }
// Produk & varian selalu diinput terpusat oleh Admin Pusat (lihat product.routes.ts
// & variant.controller.ts). Tiap Point "mengklaim" VARIAN yang mau mereka jual — ini
// yang bikin varian itu resmi jadi bagian inventaris Point tersebut (Round 18: klaim
// sekarang per varian, bukan per produk, karena tiap varian punya stok/harga sendiri).
// `qty` opsional: kalau diisi, langsung jadi stok awal (tercatat di riwayat inventory);
// kalau tidak, klaim dulu dengan stok 0 dan diisi belakangan lewat Transfer Stok /
// Purchase Order. Klaim yang sudah ada tidak dianggap error.
//
// Harga bercabang menurut tipe lokasi:
//   - RDH: wajib isi `basePrice` (harga dasar) — ini yang jadi acuan harga
//     buat Mart/Point di bawahnya.
//   - MART/POINT: wajib isi `sellPrice` (harga jual), `discountPrice` opsional.
//     RDH induk (`parentHubId`) HARUS sudah klaim & set basePrice VARIAN ini
//     dulu — kalau belum, klaim ditolak. Kalau sellPrice di bawah basePrice
//     RDH induk, klaim tetap boleh tapi responsnya membawa `belowBasePrice: true`
//     sebagai tanda peringatan (tidak diblokir).
export async function claimProduct(req: Request, res: Response) {
  const { variantId, qty } = req.body;
  if (!variantId) return fail(res, "Varian produk wajib dipilih", 422);
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!pointId) return fail(res, "Point tujuan wajib diisi", 422);

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return fail(res, "Varian produk tidak ditemukan", 404);

  const point = await prisma.fulfillmentPoint.findUnique({ where: { id: pointId } });
  if (!point) return fail(res, "Point tidak ditemukan", 404);

  const existing = await prisma.inventory.findUnique({
    where: { variantId_pointId: { variantId, pointId } },
  });
  if (existing) return ok(res, existing, "Varian ini sudah ada di inventaris Point kamu");

  let priceData: any = {};
  let belowBasePrice = false;

  if (point.type === "RDH") {
    const basePrice = Number(req.body.basePrice);
    if (!basePrice || basePrice <= 0) return fail(res, "Harga dasar (basePrice) wajib diisi RDH saat klaim produk", 422);
    priceData = { basePrice };
  } else {
    if (!point.parentHubId) return fail(res, "Point ini belum terhubung ke RDH induk, hubungi Admin Pusat", 422);
    const parentInv = await prisma.inventory.findUnique({
      where: { variantId_pointId: { variantId, pointId: point.parentHubId } },
    });
    if (!parentInv || parentInv.basePrice == null) {
      return fail(res, "RDH induk belum mengklaim/menentukan harga dasar varian ini. Minta RDH klaim & atur harga dasar dulu", 422);
    }
    const sellPrice = Number(req.body.sellPrice);
    if (!sellPrice || sellPrice <= 0) return fail(res, "Harga jual (sellPrice) wajib diisi", 422);
    const discountPrice = req.body.discountPrice ? Number(req.body.discountPrice) : null;
    belowBasePrice = sellPrice < parentInv.basePrice;
    priceData = { basePrice: parentInv.basePrice, sellPrice, discountPrice };
  }

  const initialStock = Math.max(Number(qty) || 0, 0);
  const inventory = await prisma.inventory.create({
    data: { variantId, pointId, stock: initialStock, minStock: variant.minStock, ...priceData },
    include: { variant: { include: { product: true } } },
  });

  if (initialStock > 0) {
    await prisma.inventoryHistory.create({
      data: {
        inventoryId: inventory.id,
        type: "STOCK_IN",
        qty: initialStock,
        note: "Stok awal saat klaim produk",
        createdById: req.user?.userId,
      },
    });
  }

  return ok(res, { ...inventory, belowBasePrice }, "Varian berhasil diklaim, sekarang jadi bagian inventaris Point kamu", 201);
}

// PATCH /api/inventory/:id/price  { basePrice? } (RDH) atau { sellPrice?, discountPrice? } (Mart/Point)
// "Atur Harga" — terpisah dari "Atur Stok" (updateThresholds). Sama seperti
// klaim, field yang boleh diisi tergantung tipe lokasi pemilik baris inventaris.
export async function updatePrice(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.inventory.findUnique({ where: { id } });
  if (!existing) return fail(res, "Data inventaris tidak ditemukan", 404);
  if (!canAccessPoint(req, existing.pointId)) return fail(res, "Inventaris ini bukan milik lokasi kamu", 403);

  const point = await prisma.fulfillmentPoint.findUnique({ where: { id: existing.pointId } });
  if (!point) return fail(res, "Point tidak ditemukan", 404);

  let belowBasePrice = false;
  const data: any = {};

  if (point.type === "RDH") {
    if (req.body.basePrice == null) return fail(res, "basePrice wajib diisi", 422);
    const basePrice = Number(req.body.basePrice);
    if (!basePrice || basePrice <= 0) return fail(res, "basePrice tidak valid", 422);
    data.basePrice = basePrice;
  } else {
    if (req.body.sellPrice != null) {
      const sellPrice = Number(req.body.sellPrice);
      if (!sellPrice || sellPrice <= 0) return fail(res, "sellPrice tidak valid", 422);
      data.sellPrice = sellPrice;
    }
    if (req.body.discountPrice !== undefined) {
      data.discountPrice = req.body.discountPrice === null ? null : Number(req.body.discountPrice);
    }
    const effectiveSellPrice = data.sellPrice ?? existing.sellPrice;
    if (effectiveSellPrice != null && existing.basePrice != null) {
      belowBasePrice = effectiveSellPrice < existing.basePrice;
    }
  }

  const inventory = await prisma.inventory.update({ where: { id }, data, include: { variant: { include: { product: true } } } });
  return ok(res, { ...inventory, belowBasePrice }, "Harga diperbarui");
}

// PATCH /api/inventory/:id/thresholds  { minStock?, maxStock?, safetyStock? }
// Atur ambang batas stok 1 baris inventaris — dipakai Smart Restock (auto Restock
// Request muncul begitu stock <= minStock, jumlah yang diminta menuju maxStock).
export async function updateThresholds(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.inventory.findUnique({ where: { id } });
  if (!existing) return fail(res, "Data inventaris tidak ditemukan", 404);
  if (!canAccessPoint(req, existing.pointId)) return fail(res, "Inventaris ini bukan milik lokasi kamu", 403);

  const { minStock, maxStock, safetyStock } = req.body;
  const data: any = {};
  if (minStock != null) data.minStock = Number(minStock);
  if (maxStock !== undefined) data.maxStock = maxStock === null ? null : Number(maxStock);
  if (safetyStock !== undefined) data.safetyStock = safetyStock === null ? null : Number(safetyStock);

  const inventory = await prisma.inventory.update({ where: { id }, data, include: { variant: { include: { product: true } } } });
  return ok(res, inventory, "Ambang batas stok diperbarui");
}

// POST /api/inventory/return  { variantId, pointId?, qty, note }
// Barang kembali dari customer/lokasi lain — stok BERTAMBAH.
export async function stockReturn(req: Request, res: Response) {
  const { variantId, qty, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!variantId || !pointId || !qty || qty <= 0) return fail(res, "Data tidak lengkap", 422);

  const inventory = await upsertInventory(variantId, pointId, qty);
  await prisma.inventoryHistory.create({
    data: { inventoryId: inventory.id, type: "RETURN", qty, note, createdById: req.user?.userId },
  });
  return ok(res, inventory, "Retur barang dicatat, stok bertambah");
}

// POST /api/inventory/damage  { variantId, pointId?, qty, note }
// Barang rusak — stok BERKURANG, tidak bisa dijual lagi.
export async function stockDamage(req: Request, res: Response) {
  const { variantId, qty, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!variantId || !pointId || !qty || qty <= 0) return fail(res, "Data tidak lengkap", 422);

  const existing = await prisma.inventory.findUnique({ where: { variantId_pointId: { variantId, pointId } } });
  if (!existing || existing.stock < qty) return fail(res, "Stok tidak cukup", 400);

  const inventory = await upsertInventory(variantId, pointId, -qty);
  await prisma.inventoryHistory.create({
    data: { inventoryId: inventory.id, type: "DAMAGE", qty, note, createdById: req.user?.userId },
  });
  await checkAndCreateRestockRequest(variantId, pointId).catch(() => {});
  return ok(res, inventory, "Barang rusak dicatat, stok berkurang");
}

// POST /api/inventory/expired  { variantId, pointId?, qty, note }
// Barang kadaluarsa — stok BERKURANG, tidak bisa dijual lagi.
export async function stockExpired(req: Request, res: Response) {
  const { variantId, qty, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!variantId || !pointId || !qty || qty <= 0) return fail(res, "Data tidak lengkap", 422);

  const existing = await prisma.inventory.findUnique({ where: { variantId_pointId: { variantId, pointId } } });
  if (!existing || existing.stock < qty) return fail(res, "Stok tidak cukup", 400);

  const inventory = await upsertInventory(variantId, pointId, -qty);
  await prisma.inventoryHistory.create({
    data: { inventoryId: inventory.id, type: "EXPIRED", qty, note, createdById: req.user?.userId },
  });
  await checkAndCreateRestockRequest(variantId, pointId).catch(() => {});
  return ok(res, inventory, "Barang kadaluarsa dicatat, stok berkurang");
}

// GET /api/inventory/:id/history — riwayat pergerakan stok 1 baris inventaris
export async function getInventoryHistory(req: Request, res: Response) {
  const { id } = req.params;
  const inventory = await prisma.inventory.findUnique({ where: { id } });
  if (!inventory) return fail(res, "Data inventaris tidak ditemukan", 404);
  if (!canAccessPoint(req, inventory.pointId)) return fail(res, "Inventaris ini bukan milik lokasi kamu", 403);

  const history = await prisma.inventoryHistory.findMany({
    where: { inventoryId: id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok(res, history);
}

async function upsertInventory(variantId: string, pointId: string, delta: number) {
  return prisma.inventory.upsert({
    where: { variantId_pointId: { variantId, pointId } },
    update: { stock: { increment: delta } },
    create: { variantId, pointId, stock: Math.max(delta, 0) },
  });
}
