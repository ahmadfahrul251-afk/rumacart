import { Request, Response } from "express";
import { prisma } from "../config/db";
import { createOrder } from "../services/order.service";
import { ok, fail } from "../utils/response";

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

  return ok(res, order, "Status order diperbarui");
}

// PATCH /api/orders/:id/pay — customer konfirmasi pembayaran (dummy, untuk Transfer/E-Wallet).
// Ini simulasi: di dunia nyata biasanya lewat webhook payment gateway, bukan klik customer langsung.
export async function payOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { payment: true },
  });
  if (!order) return fail(res, "Order tidak ditemukan", 404);
  if (order.customerId !== req.user!.userId) return fail(res, "Kamu tidak punya akses ke order ini", 403);
  if (!order.payment) return fail(res, "Data pembayaran tidak ditemukan", 404);
  if (order.payment.status === "PAID") return fail(res, "Order ini sudah dibayar", 400);
  if (order.status === "CANCELLED") return fail(res, "Order ini sudah dibatalkan", 400);

  const payment = await prisma.payment.update({
    where: { orderId: order.id },
    data: { status: "PAID", paidAt: new Date() },
  });
  return ok(res, payment, "Pembayaran dikonfirmasi");
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
