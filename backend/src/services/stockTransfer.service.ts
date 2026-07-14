import { prisma } from "../config/db";

interface TransferItemInput {
  productId: string;
  qty: number;
}

interface CreateTransferInput {
  fromPointId?: string; // kosong = mode lama ("dari Pusat", stok sumber tidak dipotong)
  toPointId: string;
  notes?: string;
  items: TransferItemInput[];
  createdById: string;
}

// Transfer stok antar lokasi mana pun di jaringan RumaCart (RDH->Mart, RDH->Point,
// Mart->Point, Mart->Mart, RDH->RDH, dst). Beda dari Purchase Order: TIDAK ada
// uang/cashflow yang tercatat, murni pemindahan stok. Kalau `fromPointId` diisi,
// stok lokasi asal langsung dipotong saat status SENT (barang dianggap "berangkat");
// baru bertambah di lokasi tujuan setelah dikonfirmasi lewat receiveStockTransfer().
export async function createStockTransfer(input: CreateTransferInput) {
  if (!input.items.length) throw new Error("Item transfer tidak boleh kosong");
  if (input.fromPointId && input.fromPointId === input.toPointId) {
    throw new Error("Lokasi asal dan tujuan tidak boleh sama");
  }

  const itemsData = input.items.map((item) => {
    if (!item.productId || !item.qty || item.qty <= 0) {
      throw new Error("Data item transfer tidak lengkap/valid");
    }
    return { productId: item.productId, qty: item.qty };
  });
  const transferNumber = generateTransferNumber();

  return prisma.$transaction(async (tx: any) => {
    if (input.fromPointId) {
      for (const item of itemsData) {
        const inv = await tx.inventory.findUnique({
          where: { productId_pointId: { productId: item.productId, pointId: input.fromPointId } },
        });
        if (!inv || inv.stock < item.qty) {
          throw new Error("Stok di lokasi asal tidak cukup untuk salah satu produk");
        }
      }
    }

    const transfer = await tx.stockTransfer.create({
      data: {
        transferNumber,
        fromPointId: input.fromPointId,
        toPointId: input.toPointId,
        notes: input.notes,
        status: "SENT",
        createdById: input.createdById,
        items: { create: itemsData },
      },
      include: { items: { include: { product: true } }, toPoint: true, fromPoint: true },
    });

    if (input.fromPointId) {
      for (const item of itemsData) {
        const inv = await tx.inventory.update({
          where: { productId_pointId: { productId: item.productId, pointId: input.fromPointId } },
          data: { stock: { decrement: item.qty } },
        });
        await tx.inventoryHistory.create({
          data: {
            inventoryId: inv.id,
            type: "TRANSFER_OUT",
            qty: item.qty,
            note: `Kirim transfer stok ${transfer.transferNumber}`,
            refId: transfer.id,
            createdById: input.createdById,
          },
        });
      }
    }

    return transfer;
  }, {
    maxWait: 10000,
    timeout: 20000,
  });
}

// Lokasi tujuan mengonfirmasi barang sudah benar-benar diterima: stok lokasi itu
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
          note: `Terima transfer stok ${transfer.transferNumber}`,
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
    include: { items: { include: { product: true } }, toPoint: true, fromPoint: true },
  });
}

export async function cancelStockTransfer(transferId: string) {
  const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId }, include: { items: true } });
  if (!transfer) throw new Error("Transfer stok tidak ditemukan");
  if (transfer.status !== "SENT") throw new Error("Hanya transfer berstatus SENT yang bisa dibatalkan");

  return prisma.$transaction(async (tx: any) => {
    if (transfer.fromPointId) {
      // Stok sudah dipotong dari lokasi asal saat SENT — kembalikan karena batal jadi dikirim.
      for (const item of transfer.items) {
        const inv = await tx.inventory.update({
          where: { productId_pointId: { productId: item.productId, pointId: transfer.fromPointId! } },
          data: { stock: { increment: item.qty } },
        });
        await tx.inventoryHistory.create({
          data: {
            inventoryId: inv.id,
            type: "ADJUSTMENT",
            qty: item.qty,
            note: `Transfer ${transfer.transferNumber} dibatalkan, stok dikembalikan ke lokasi asal`,
            refId: transfer.id,
          },
        });
      }
    }
    return tx.stockTransfer.update({ where: { id: transferId }, data: { status: "CANCELLED" } });
  });
}

function generateTransferNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${y}${m}${d}-${rand}`;
}
