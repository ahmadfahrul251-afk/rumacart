import { prisma } from "../config/db";

interface TransferItemInput {
  productId: string;
  qty: number;
}

interface CreateTransferInput {
  toPointId: string;
  notes?: string;
  items: TransferItemInput[];
  createdById: string;
}

// Admin Pusat mengirim stok ke 1 Point (berperan sebagai "supplier internal").
// Beda dari Purchase Order: TIDAK ada uang/cashflow yang tercatat di sini,
// murni pemindahan stok. Status langsung "SENT" — stok Point tujuan BARU
// bertambah setelah Point mengonfirmasi lewat receiveStockTransfer().
export async function createStockTransfer(input: CreateTransferInput) {
  if (!input.items.length) throw new Error("Item transfer tidak boleh kosong");

  const itemsData = input.items.map((item) => {
    if (!item.productId || !item.qty || item.qty <= 0) {
      throw new Error("Data item transfer tidak lengkap/valid");
    }
    return { productId: item.productId, qty: item.qty };
  });
  const transferNumber = generateTransferNumber();

  return prisma.stockTransfer.create({
    data: {
      transferNumber,
      toPointId: input.toPointId,
      notes: input.notes,
      status: "SENT",
      createdById: input.createdById,
      items: { create: itemsData },
    },
    include: { items: { include: { product: true } }, toPoint: true },
  });
}

// Point tujuan mengonfirmasi barang sudah benar-benar diterima: stok Point itu
// bertambah, riwayat inventory dicatat, status jadi RECEIVED.
export async function receiveStockTransfer(transferId: string, userId: string) {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId }, include: { items: true } });
  if (!transfer) throw new Error("Transfer stok tidak ditemukan");
  if (transfer.status !== "SENT") throw new Error("Transfer ini sudah diterima/dibatalkan sebelumnya");

  await prisma.$transaction(async (tx: any) => {
    for (const item of transfer.items) {
      const inv = await tx.inventory.upsert({
        where: { productId_pointId: { productId: item.productId, pointId: transfer.toPointId } },
        update: { stock: { increment: item.qty } },
        create: { productId: item.productId, pointId: transfer.toPointId, stock: item.qty },
      });
      await tx.inventoryHistory.create({
        data: {
          inventoryId: inv.id,
          type: "TRANSFER_IN",
          qty: item.qty,
          note: `Terima transfer stok ${transfer.transferNumber} dari Pusat`,
          refId: transfer.id,
          createdById: userId,
        },
      });
    }

    await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });
  }, {
    // Sama seperti checkout/PO: naikkan batas waktu transaksi supaya tidak gagal
    // saat database gratis (Neon) sedang lambat/baru "bangun".
    maxWait: 10000,
    timeout: 20000,
  });

  return prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: { items: { include: { product: true } }, toPoint: true },
  });
}

export async function cancelStockTransfer(transferId: string) {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId } });
  if (!transfer) throw new Error("Transfer stok tidak ditemukan");
  if (transfer.status !== "SENT") throw new Error("Hanya transfer berstatus SENT yang bisa dibatalkan");

  return prisma.stockTransfer.update({ where: { id: transferId }, data: { status: "CANCELLED" } });
}

function generateTransferNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${y}${m}${d}-${rand}`;
}
