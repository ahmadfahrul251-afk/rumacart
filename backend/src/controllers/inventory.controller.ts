import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { scopedPointId, resolveWritePointId } from "../utils/pointScope";

// GET /api/inventory?pointId=xxx — daftar stok produk di satu Point (atau semua).
// Admin Point otomatis terkunci ke Point-nya sendiri, tidak peduli query yang dikirim.
export async function listInventory(req: Request, res: Response) {
  const pointId = scopedPointId(req);
  const where = pointId ? { pointId } : {};
  const inventory = await prisma.inventory.findMany({
    where,
    include: { product: true, point: true },
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
    prisma.product.count({ where: { isActive: true } }), // 1 produk = 1 SKU di model ini
    prisma.inventory.count({ where: { ...invWhere, stock: 0 } }),
    prisma.inventory.findMany({ where: invWhere, include: { product: true } }),
  ]);

  // Hitung manual "stok menipis" (stock > 0 tapi <= minStock) karena Prisma
  // belum mendukung perbandingan antar kolom secara langsung di semua versi.
  const lowStockCount = allInventory.filter((i: any) => i.stock > 0 && i.stock <= i.minStock).length;
  const inventoryValue = allInventory.reduce((sum: number, i: any) => sum + i.stock * i.product.costPrice, 0);

  return ok(res, {
    totalProducts,
    totalSku,
    lowStock: lowStockCount,
    outOfStock,
    inventoryValue,
  });
}

// POST /api/inventory/stock-in  { productId, pointId, qty, note }
// Admin Point: pointId dari body diabaikan, dipaksa pakai Point yang dia kelola.
export async function stockIn(req: Request, res: Response) {
  const { productId, qty, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!productId || !pointId || !qty || qty <= 0) return fail(res, "Data tidak lengkap", 422);

  const inventory = await upsertInventory(productId, pointId, qty);
  await prisma.inventoryHistory.create({
    data: { inventoryId: inventory.id, type: "STOCK_IN", qty, note, createdById: req.user?.userId },
  });
  return ok(res, inventory, "Stok masuk dicatat");
}

// POST /api/inventory/stock-out  { productId, pointId, qty, note }
export async function stockOut(req: Request, res: Response) {
  const { productId, qty, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!productId || !pointId || !qty || qty <= 0) return fail(res, "Data tidak lengkap", 422);

  const existing = await prisma.inventory.findUnique({ where: { productId_pointId: { productId, pointId } } });
  if (!existing || existing.stock < qty) return fail(res, "Stok tidak cukup", 400);

  const inventory = await upsertInventory(productId, pointId, -qty);
  await prisma.inventoryHistory.create({
    data: { inventoryId: inventory.id, type: "STOCK_OUT", qty, note, createdById: req.user?.userId },
  });
  return ok(res, inventory, "Stok keluar dicatat");
}

// POST /api/inventory/transfer  { productId, fromPointId, toPointId, qty, note }
export async function transferStock(req: Request, res: Response) {
  const { productId, fromPointId, toPointId, qty, note } = req.body;
  if (!productId || !fromPointId || !toPointId || !qty || qty <= 0) {
    return fail(res, "Data tidak lengkap", 422);
  }
  if (fromPointId === toPointId) return fail(res, "Point asal dan tujuan tidak boleh sama", 422);

  const source = await prisma.inventory.findUnique({
    where: { productId_pointId: { productId, pointId: fromPointId } },
  });
  if (!source || source.stock < qty) return fail(res, "Stok di Point asal tidak cukup", 400);

  const [fromInv, toInv] = await prisma.$transaction([
    prisma.inventory.update({
      where: { productId_pointId: { productId, pointId: fromPointId } },
      data: { stock: { decrement: qty } },
    }),
    prisma.inventory.upsert({
      where: { productId_pointId: { productId, pointId: toPointId } },
      update: { stock: { increment: qty } },
      create: { productId, pointId: toPointId, stock: qty },
    }),
  ]);

  await prisma.inventoryHistory.createMany({
    data: [
      { inventoryId: fromInv.id, type: "TRANSFER_OUT", qty, note, createdById: req.user?.userId },
      { inventoryId: toInv.id, type: "TRANSFER_IN", qty, note, createdById: req.user?.userId },
    ],
  });

  return ok(res, { fromInv, toInv }, "Transfer stok berhasil");
}

// POST /api/inventory/adjustment  { productId, pointId, newStock, note }
// Dipakai untuk hasil Stock Opname (stok fisik vs sistem berbeda).
export async function adjustment(req: Request, res: Response) {
  const { productId, newStock, note } = req.body;
  const pointId = resolveWritePointId(req, req.body.pointId);
  if (!productId || !pointId || newStock == null) return fail(res, "Data tidak lengkap", 422);

  const existing = await prisma.inventory.upsert({
    where: { productId_pointId: { productId, pointId } },
    update: {},
    create: { productId, pointId, stock: 0 },
  });
  const diff = Number(newStock) - existing.stock;

  const inventory = await prisma.inventory.update({
    where: { productId_pointId: { productId, pointId } },
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
  return ok(res, inventory, "Stok disesuaikan");
}

async function upsertInventory(productId: string, pointId: string, delta: number) {
  return prisma.inventory.upsert({
    where: { productId_pointId: { productId, pointId } },
    update: { stock: { increment: delta } },
    create: { productId, pointId, stock: Math.max(delta, 0) },
  });
}
