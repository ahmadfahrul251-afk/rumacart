import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";
import { withVariantSummary } from "./product.controller";

// Belanja Bulanan: tiap customer (realistisnya) cuma punya 1 daftar yang terus
// dipakai tiap bulan, jadi endpoint "me" ini auto-bikin satu kalau belum ada —
// customer tidak perlu tahu konsep "bikin rencana baru", langsung ada isinya.
export async function getMyPlan(req: Request, res: Response) {
  const userId = req.user!.userId;

  let plan = await prisma.shoppingPlan.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!plan) {
    const today = new Date();
    plan = await prisma.shoppingPlan.create({
      data: { userId, checkoutDay: Math.min(today.getDate(), 28), reminderOffsetDays: 3 },
    });
  }

  return ok(res, await serializePlan(plan.id));
}

// PATCH /shopping-plans/:id — ubah nama/tanggal checkout/pengingat/aktif-nonaktif.
export async function updatePlan(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userId;

  const plan = await prisma.shoppingPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== userId) return fail(res, "Rencana tidak ditemukan", 404);

  const body = req.body;
  const data: Record<string, any> = {};

  if (body.name !== undefined) data.name = String(body.name).trim() || "Belanja Bulanan";

  if (body.checkoutDay !== undefined) {
    const day = Number(body.checkoutDay);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      return fail(res, "Tanggal checkout harus antara 1-28 (biar aman untuk semua bulan)", 422);
    }
    data.checkoutDay = day;
  }

  if (body.reminderOffsetDays !== undefined) {
    const offset = Number(body.reminderOffsetDays);
    if (!Number.isInteger(offset) || offset < 0 || offset > 7) {
      return fail(res, "Pengingat harus 0-7 hari sebelum tanggal checkout", 422);
    }
    data.reminderOffsetDays = offset;
  }

  if (body.isActive !== undefined) data.isActive = !!body.isActive;

  await prisma.shoppingPlan.update({ where: { id }, data });
  return ok(res, await serializePlan(id), "Jadwal Belanja Bulanan diperbarui");
}

// POST /shopping-plans/:id/items  { variantId, qty? }
export async function addItem(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userId;

  const plan = await prisma.shoppingPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== userId) return fail(res, "Rencana tidak ditemukan", 404);

  const { variantId } = req.body;
  if (!variantId) return fail(res, "variantId wajib diisi", 422);
  const addQty = req.body.qty ? Number(req.body.qty) : 1;
  if (!Number.isInteger(addQty) || addQty < 1) return fail(res, "Jumlah minimal 1", 422);

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant || !variant.isActive) return fail(res, "Produk tidak ditemukan", 404);

  const existing = await prisma.shoppingPlanItem.findUnique({
    where: { planId_variantId: { planId: id, variantId } },
  });
  if (existing) {
    await prisma.shoppingPlanItem.update({ where: { id: existing.id }, data: { qty: existing.qty + addQty } });
  } else {
    await prisma.shoppingPlanItem.create({ data: { planId: id, variantId, qty: addQty } });
  }

  return ok(res, await serializePlan(id), "Ditambahkan ke Belanja Bulanan", 201);
}

// PATCH /shopping-plans/:id/items/:itemId  { qty }
export async function updateItem(req: Request, res: Response) {
  const { id, itemId } = req.params;
  const userId = req.user!.userId;

  const plan = await prisma.shoppingPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== userId) return fail(res, "Rencana tidak ditemukan", 404);

  const quantity = Number(req.body.qty);
  if (!Number.isInteger(quantity) || quantity < 1) return fail(res, "Jumlah minimal 1", 422);

  const item = await prisma.shoppingPlanItem.findUnique({ where: { id: itemId } });
  if (!item || item.planId !== id) return fail(res, "Item tidak ditemukan", 404);

  await prisma.shoppingPlanItem.update({ where: { id: itemId }, data: { qty: quantity } });
  return ok(res, await serializePlan(id), "Jumlah diperbarui");
}

// DELETE /shopping-plans/:id/items/:itemId
export async function removeItem(req: Request, res: Response) {
  const { id, itemId } = req.params;
  const userId = req.user!.userId;

  const plan = await prisma.shoppingPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== userId) return fail(res, "Rencana tidak ditemukan", 404);

  const item = await prisma.shoppingPlanItem.findUnique({ where: { id: itemId } });
  if (!item || item.planId !== id) return fail(res, "Item tidak ditemukan", 404);

  await prisma.shoppingPlanItem.delete({ where: { id: itemId } });
  return ok(res, await serializePlan(id), "Dihapus dari Belanja Bulanan");
}

// Bentuk data plan + item yang dikirim ke frontend — item dilengkapi nama
// produk/varian, gambar, dan estimasi rentang harga (dipakai buat tampilan
// "Estimasi Total" di halaman Belanja Bulanan; harga & Point sebenarnya baru
// ditentukan pas "Pindahkan ke Keranjang" lewat endpoint /points/eligible yang
// sudah ada, sama seperti alur Beli Sekarang biasa).
async function serializePlan(planId: string) {
  const plan = await prisma.shoppingPlan.findUnique({ where: { id: planId } });
  const items = await prisma.shoppingPlanItem.findMany({
    where: { planId },
    include: { variant: { include: { product: true, inventory: true } } },
    orderBy: { createdAt: "asc" },
  });

  const enrichedItems = items.map((item: any) => {
    const summary = withVariantSummary(item.variant);
    return {
      id: item.id,
      variantId: item.variantId,
      qty: item.qty,
      variantName: item.variant.name,
      productName: item.variant.product.name,
      image: item.variant.image || item.variant.product.images?.[0] || null,
      priceMin: summary.priceMin,
      priceMax: summary.priceMax,
    };
  });

  return { ...plan, items: enrichedItems };
}
