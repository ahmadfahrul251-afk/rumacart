import { prisma } from "../config/db";
import { recordCashflow } from "./cashflow.service";

interface PoItemInput {
  productId: string;
  qty: number;
  costPrice: number;
}

interface CreatePoInput {
  supplierId: string;
  pointId: string;
  notes?: string;
  items: PoItemInput[];
  createdById: string;
}

// Membuat Purchase Order baru. Status langsung "ORDERED" (dianggap sudah
// dipesan ke supplier) — stok & cashflow BELUM berubah sampai barang
// benar-benar diterima lewat receivePurchaseOrder().
export async function createPurchaseOrder(input: CreatePoInput) {
  if (!input.items.length) throw new Error("Item PO tidak boleh kosong");

  const itemsData = input.items.map((item) => {
    if (!item.productId || !item.qty || item.qty <= 0 || item.costPrice == null || item.costPrice < 0) {
      throw new Error("Data item PO tidak lengkap/valid");
    }
    return { ...item, subtotal: item.qty * item.costPrice };
  });
  const totalAmount = itemsData.reduce((sum, i) => sum + i.subtotal, 0);
  const poNumber = generatePoNumber();

  return prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: input.supplierId,
      pointId: input.pointId,
      notes: input.notes,
      totalAmount,
      status: "ORDERED",
      createdById: input.createdById,
      items: { create: itemsData },
    },
    include: { items: { include: { product: true } }, supplier: true, point: true },
  });
}

// Barang dari supplier sudah datang: tambah stok di Point tujuan, catat
// riwayat inventory, ubah status jadi RECEIVED, lalu catat pengeluaran cashflow.
export async function receivePurchaseOrder(poId: string, userId: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true } });
  if (!po) throw new Error("Purchase Order tidak ditemukan");
  if (po.status !== "ORDERED") throw new Error("PO ini sudah diterima/dibatalkan sebelumnya");

  await prisma.$transaction(async (tx: any) => {
    for (const item of po.items) {
      const inv = await tx.inventory.upsert({
        where: { productId_pointId: { productId: item.productId, pointId: po.pointId } },
        update: { stock: { increment: item.qty } },
        create: { productId: item.productId, pointId: po.pointId, stock: item.qty },
      });
      await tx.inventoryHistory.create({
        data: {
          inventoryId: inv.id,
          type: "STOCK_IN",
          qty: item.qty,
          note: `Terima barang PO ${po.poNumber}`,
          refId: po.id,
          createdById: userId,
        },
      });
    }

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });
  }, {
    // Sama seperti checkout: naikkan batas waktu transaksi supaya tidak gagal
    // saat database gratis (Neon) sedang lambat/baru "bangun".
    maxWait: 10000,
    timeout: 20000,
  });

  await recordCashflow({
    type: "OUT",
    category: "Belanja Supplier",
    amount: po.totalAmount,
    description: `Terima barang PO ${po.poNumber}`,
    pointId: po.pointId,
    refType: "PURCHASE_ORDER",
    refId: po.id,
    createdById: userId,
  });

  return prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: { include: { product: true } }, supplier: true, point: true },
  });
}

export async function cancelPurchaseOrder(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) throw new Error("Purchase Order tidak ditemukan");
  if (po.status !== "ORDERED") throw new Error("Hanya PO berstatus ORDERED yang bisa dibatalkan");

  return prisma.purchaseOrder.update({ where: { id: poId }, data: { status: "CANCELLED" } });
}

function generatePoNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${y}${m}${d}-${rand}`;
}
