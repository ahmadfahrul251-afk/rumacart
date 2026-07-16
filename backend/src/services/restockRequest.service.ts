import { prisma } from "../config/db";
import { createStockTransfer } from "./stockTransfer.service";

// Dipanggil setelah stok 1 VARIAN di 1 lokasi berkurang (penjualan, stock-out,
// transfer keluar, dst). Kalau stoknya sudah di/bawah minStock DAN belum ada
// Restock Request yang masih PENDING/APPROVED untuk varian+lokasi yang sama,
// sistem otomatis bikin satu — inilah "Smart Restock". (Round 18: per varian,
// bukan per produk, karena tiap varian punya stok sendiri.)
export async function checkAndCreateRestockRequest(variantId: string, pointId: string) {
  const inv = await prisma.inventory.findUnique({ where: { variantId_pointId: { variantId, pointId } } });
  if (!inv || inv.stock > inv.minStock) return null;

  const existing = await prisma.restockRequest.findFirst({
    where: { variantId, pointId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (existing) return null;

  const point = await prisma.fulfillmentPoint.findUnique({ where: { id: pointId } });
  if (!point) return null;

  // Target stok: maxStock kalau diatur, kalau tidak pakai 2x minStock sebagai default wajar.
  const target = inv.maxStock ?? inv.minStock * 2;
  const qty = Math.max(target - inv.stock, inv.minStock); // minimal minta sejumlah minStock
  const requestNumber = generateRequestNumber();

  return prisma.restockRequest.create({
    data: {
      requestNumber,
      pointId,
      variantId,
      qty,
      isAuto: true,
      sourceHubId: point.parentHubId, // auto-saran: RDH/Mart induk lokasi ini
      note: `Otomatis: stok tinggal ${inv.stock} (min ${inv.minStock})`,
    },
  });
}

interface ManualRestockInput {
  pointId: string;
  variantId: string;
  qty: number;
  sourceHubId?: string;
  note?: string;
}

export async function createManualRestockRequest(input: ManualRestockInput) {
  if (!input.qty || input.qty <= 0) throw new Error("Jumlah restock harus lebih dari 0");
  const requestNumber = generateRequestNumber();
  return prisma.restockRequest.create({
    data: {
      requestNumber,
      pointId: input.pointId,
      variantId: input.variantId,
      qty: input.qty,
      sourceHubId: input.sourceHubId,
      note: input.note,
      isAuto: false,
    },
    include: { point: true, sourceHub: true, variant: { include: { product: true } } },
  });
}

export async function approveRestockRequest(id: string, sourceHubId?: string) {
  const req = await prisma.restockRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Restock Request tidak ditemukan");
  if (req.status !== "PENDING") throw new Error("Cuma Restock Request berstatus PENDING yang bisa di-approve");
  const finalSourceHubId = sourceHubId || req.sourceHubId;
  if (!finalSourceHubId) throw new Error("Lokasi sumber (yang mensuplai) wajib ditentukan sebelum approve");

  return prisma.restockRequest.update({
    where: { id },
    data: { status: "APPROVED", sourceHubId: finalSourceHubId, approvedAt: new Date() },
  });
}

export async function rejectRestockRequest(id: string) {
  const req = await prisma.restockRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Restock Request tidak ditemukan");
  if (req.status !== "PENDING") throw new Error("Cuma Restock Request berstatus PENDING yang bisa ditolak");
  return prisma.restockRequest.update({ where: { id }, data: { status: "REJECTED" } });
}

// "Fulfill" = bikinkan Stock Transfer dari lokasi sumber ke lokasi peminta.
// Stok baru benar-benar pindah setelah lokasi peminta konfirmasi terima transfer
// itu (alur yang sama seperti Transfer Stok biasa).
export async function fulfillRestockRequest(id: string, userId: string) {
  const req = await prisma.restockRequest.findUnique({ where: { id } });
  if (!req) throw new Error("Restock Request tidak ditemukan");
  if (req.status !== "APPROVED") throw new Error("Cuma Restock Request berstatus APPROVED yang bisa di-fulfill");
  if (!req.sourceHubId) throw new Error("Lokasi sumber belum ditentukan");

  const transfer = await createStockTransfer({
    fromPointId: req.sourceHubId,
    toPointId: req.pointId,
    notes: `Fulfill Restock Request ${req.requestNumber}`,
    items: [{ variantId: req.variantId, qty: req.qty }],
    createdById: userId,
  });

  return prisma.restockRequest.update({
    where: { id },
    data: { status: "FULFILLED", fulfilledAt: new Date(), transferId: transfer.id },
  });
}

function generateRequestNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RSQ-${y}${m}${d}-${rand}`;
}
