import { Request, Response } from "express";
import { prisma } from "../config/db";
import { createOrder } from "../services/order.service";
import { createNotification } from "../services/notification.service";
import { ok, fail } from "../utils/response";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "menunggu diproses",
  PROCESSED: "sedang diproses",
  PREPARED: "sedang disiapkan",
  PICKED_UP: "sudah diambil gudang, siap dikirim",
  SHIPPED: "sedang dalam pengiriman",
  COMPLETED: "selesai",
  CANCELLED: "dibatalkan",
};

// POST /api/orders — checkout
export async function checkout(req: Request, res: Response) {
  try {
    const { addressId, items, shippingMethod, paymentMethod, voucherCode, notes } = req.body;
    if (!items || !items.length) return fail(res, "Keranjang kosong", 422);

    const order = await createOrder({
      customerId: req.user!.userId,
      addressId,
      items,
      shippingMethod: shippingMethod || "PICKUP",
      paymentMethod: paymentMethod || "COD",
      voucherCode,
      notes,
    });
    return ok(res, order, "Order berhasil dibuat", 201);
  } catch (err: any) {
    return fail(res, err.message || "Gagal membuat order", 400);
  }
}

// GET /api/orders/my — riwayat order customer yang sedang login
export async function myOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { customerId: req.user!.userId },
    include: { items: { include: { product: true } }, point: true, payment: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, orders);
}

// GET /api/orders — semua order (untuk Admin/Gudang/Kasir), bisa difilter status
export async function listOrders(req: Request, res: Response) {
  const { status, pointId } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;
  if (pointId) where.pointId = pointId;

  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { product: true } }, point: true, customer: true, payment: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, orders);
}

// GET /api/orders/:id
export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } }, point: true, customer: true, address: true, payment: true },
  });
  if (!order) return fail(res, "Order tidak ditemukan", 404);
  return ok(res, order);
}

// PATCH /api/orders/:id/status — dipakai Gudang/Kurir/Admin update status pesanan
const VALID_STATUS = ["PENDING", "PROCESSED", "PREPARED", "PICKED_UP", "SHIPPED", "COMPLETED", "CANCELLED"];
export async function updateStatus(req: Request, res: Response) {
  const { status, courierId } = req.body;
  if (!VALID_STATUS.includes(status)) return fail(res, "Status tidak valid", 422);

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status, ...(courierId ? { courierId } : {}) },
    include: { payment: true },
  });

  // COD dianggap lunas begitu barang sudah diterima customer (dibayar tunai ke kurir).
  if (status === "COMPLETED" && order.paymentMethod === "COD" && order.payment && order.payment.status !== "PAID") {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  // Kabari customer bahwa status pesanannya berubah.
  await createNotification({
    userId: order.customerId,
    title: `Pesanan ${order.orderNumber}`,
    message: `Pesananmu sekarang ${STATUS_LABEL[status] || status}.`,
    type: "ORDER",
    refId: order.id,
  });

  return ok(res, order, "Status order diperbarui");
}

// PATCH /api/orders/:id/pay — customer konfirmasi pembayaran.
// - TRANSFER: rekening yang ditampilkan adalah rekening asli, jadi klik ini TIDAK langsung
//   menandai lunas — statusnya jadi AWAITING_VERIFICATION, menunggu Admin/Kasir cek mutasi
//   rekening secara manual lalu konfirmasi lewat verifyPayment().
// - EWALLET: masih simulasi penuh (belum ada payment gateway), jadi langsung PAID.
export async function payOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  });
  if (!order) return fail(res, "Order tidak ditemukan", 404);
  if (order.customerId !== req.user!.userId) return fail(res, "Kamu tidak punya akses ke order ini", 403);
  if (!order.payment) return fail(res, "Data pembayaran tidak ditemukan", 404);
  if (order.payment.status === "PAID") return fail(res, "Order ini sudah dibayar", 400);
  if (order.payment.status === "AWAITING_VERIFICATION") {
    return fail(res, "Konfirmasi transfer kamu sudah kami terima, sedang menunggu verifikasi", 400);
  }
  if (order.status === "CANCELLED") return fail(res, "Order ini sudah dibatalkan", 400);

  const isTransfer = order.paymentMethod === "TRANSFER";
  const payment = await prisma.payment.update({
    where: { orderId: order.id },
    data: isTransfer
      ? { status: "AWAITING_VERIFICATION" }
      : { status: "PAID", paidAt: new Date() },
  });
  return ok(res, payment, isTransfer ? "Konfirmasi transfer diterima, menunggu verifikasi" : "Pembayaran dikonfirmasi");
}

// PATCH /api/orders/:id/verify-payment — Admin/Kasir menandai pembayaran transfer
// sebagai lunas SETELAH mengecek manual bahwa uang sudah benar-benar masuk ke rekening.
export async function verifyPayment(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  });
  if (!order) return fail(res, "Order tidak ditemukan", 404);
  if (!order.payment) return fail(res, "Data pembayaran tidak ditemukan", 404);
  if (order.payment.status === "PAID") return fail(res, "Pembayaran ini sudah diverifikasi sebelumnya", 400);

  const payment = await prisma.payment.update({
    where: { orderId: order.id },
    data: { status: "PAID", paidAt: new Date() },
  });

  await createNotification({
    userId: order.customerId,
    title: `Pembayaran ${order.orderNumber} Terverifikasi`,
    message: "Pembayaranmu sudah kami verifikasi dan pesanan akan segera diproses. Terima kasih!",
    type: "ORDER",
    refId: order.id,
  });

  return ok(res, payment, "Pembayaran diverifikasi & ditandai lunas");
}

// GET /api/orders/awaiting-verification — daftar order yang menunggu verifikasi manual (Admin/Kasir)
export async function listAwaitingVerification(_req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { payment: { status: "AWAITING_VERIFICATION" } },
    include: { items: { include: { product: true } }, point: true, customer: true, payment: true },
    orderBy: { createdAt: "asc" },
  });
  return ok(res, orders);
}

// GET /api/orders/courier/assigned — order yang sudah diambil kurir ini (SHIPPED),
// PLUS order yang statusnya PICKED_UP dan belum ada kurirnya (bisa diambil).
export async function courierOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { courierId: req.user!.userId, status: { in: ["SHIPPED"] } },
        { status: "PICKED_UP", courierId: null },
      ],
    },
    include: { items: true, point: true, customer: true, address: true },
    orderBy: { createdAt: "asc" },
  });
  return ok(res, orders);
}
