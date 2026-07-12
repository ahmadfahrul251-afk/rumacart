import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../config/db";
import { fail } from "../utils/response";
import { canAccessPoint } from "../utils/pointScope";

const PAYMENT_LABEL: Record<string, string> = {
  COD: "Bayar di Tempat (COD)",
  TRANSFER: "Transfer Bank",
  EWALLET: "E-Wallet",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  AWAITING_VERIFICATION: "Menunggu Verifikasi",
  PAID: "Lunas",
  FAILED: "Gagal",
};

function formatRupiah(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}

async function loadOrderForDocument(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      point: true,
      address: true,
      customer: true,
      payment: true,
    },
  });
}

// Semua endpoint di file ini: customer cuma boleh unduh dokumen order miliknya
// sendiri, Admin Point cuma boleh unduh order di Point-nya sendiri, staff lain
// (non-CUSTOMER, non-ADMIN_POINT) boleh unduh order siapa saja (perlu buat cetak di POS).
function canAccess(order: any, req: Request) {
  if (req.user!.role === "CUSTOMER") return order.customerId === req.user!.userId;
  return canAccessPoint(req, order.pointId);
}

// GET /api/orders/:id/invoice — invoice formal ukuran A4, dipakai customer.
export async function downloadInvoice(req: Request, res: Response) {
  const order = await loadOrderForDocument(req.params.id);
  if (!order) return fail(res, "Order tidak ditemukan", 404);
  if (!canAccess(order, req)) return fail(res, "Kamu tidak punya akses ke order ini", 403);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=invoice-${order.orderNumber}.pdf`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fillColor("#0B6A3B").fontSize(22).font("Helvetica-Bold").text("RumaCart", 50, 50);
  doc
    .fillColor("#202020")
    .fontSize(10)
    .font("Helvetica")
    .text("Belanja kebutuhan harian tanpa harus keluar rumah", 50, 76);

  doc.fontSize(16).font("Helvetica-Bold").fillColor("#202020").text("INVOICE", 350, 50, { width: 195, align: "right" });
  doc.fontSize(10).font("Helvetica").fillColor("#666").text(order.orderNumber, 350, 72, { width: 195, align: "right" });
  doc.text(
    new Date(order.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" }),
    350,
    86,
    { width: 195, align: "right" }
  );

  doc.moveTo(50, 115).lineTo(545, 115).strokeColor("#e5e5e5").stroke();

  let y = 132;
  doc.fontSize(9).fillColor("#999").font("Helvetica").text("DITAGIHKAN KE", 50, y);
  doc.fillColor("#202020").fontSize(11).font("Helvetica-Bold").text(order.customer.name, 50, y + 14);
  doc.font("Helvetica").fontSize(9).fillColor("#444");
  if (order.address) {
    doc.text(`${order.address.fullAddress}, ${order.address.city}`, 50, y + 30, { width: 250 });
  } else {
    doc.text("Pickup / tanpa alamat pengiriman", 50, y + 30, { width: 250 });
  }

  doc.fontSize(9).fillColor("#999").font("Helvetica").text("DIKIRIM DARI", 320, y);
  doc.fillColor("#202020").fontSize(11).font("Helvetica-Bold").text(order.point.name, 320, y + 14);
  doc.font("Helvetica").fontSize(9).fillColor("#444").text(`${order.point.address}, ${order.point.city}`, 320, y + 30, { width: 225 });

  y += 90;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#0B6A3B").lineWidth(1).stroke();
  y += 8;
  doc.fontSize(9).fillColor("#666").font("Helvetica-Bold");
  doc.text("PRODUK", 50, y, { width: 280 });
  doc.text("QTY", 330, y, { width: 40, align: "right" });
  doc.text("HARGA", 375, y, { width: 80, align: "right" });
  doc.text("SUBTOTAL", 460, y, { width: 85, align: "right" });
  y += 14;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#e5e5e5").stroke();
  y += 8;

  doc.font("Helvetica").fontSize(9).fillColor("#202020");
  for (const item of order.items) {
    doc.text(item.product?.name || "Produk", 50, y, { width: 280 });
    doc.text(String(item.qty), 330, y, { width: 40, align: "right" });
    doc.text(formatRupiah(item.price), 375, y, { width: 80, align: "right" });
    doc.text(formatRupiah(item.subtotal), 460, y, { width: 85, align: "right" });
    y += 18;
  }

  y += 6;
  doc.moveTo(320, y).lineTo(545, y).strokeColor("#e5e5e5").stroke();
  y += 10;

  const totalLine = (label: string, value: string, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).fillColor(bold ? "#0B6A3B" : "#666");
    doc.text(label, 320, y, { width: 140 });
    doc.text(value, 460, y, { width: 85, align: "right" });
    y += bold ? 20 : 16;
  };
  totalLine("Subtotal", formatRupiah(order.subtotal));
  totalLine("Ongkir", formatRupiah(order.shippingCost));
  if (order.discount > 0) totalLine("Diskon", "-" + formatRupiah(order.discount));
  totalLine("TOTAL", formatRupiah(order.total), true);

  y += 24;
  doc.fillColor("#202020").font("Helvetica").fontSize(9);
  doc.text(`Metode Pembayaran: ${PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}`, 50, y);
  y += 14;
  doc.text(`Status Pembayaran: ${PAYMENT_STATUS_LABEL[order.payment?.status || "PENDING"]}`, 50, y);

  doc.fontSize(8).fillColor("#999").text("Terima kasih telah berbelanja di RumaCart.", 50, 780, { align: "center", width: 495 });

  doc.end();
}

// GET /api/orders/:id/receipt — struk ringkas gaya thermal printer, dipakai POS Kasir.
export async function downloadReceipt(req: Request, res: Response) {
  const order = await loadOrderForDocument(req.params.id);
  if (!order) return fail(res, "Order tidak ditemukan", 404);
  if (!canAccess(order, req)) return fail(res, "Kamu tidak punya akses ke order ini", 403);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=struk-${order.orderNumber}.pdf`);

  const width = 227; // ~80mm, lebar umum kertas thermal
  const height = 260 + order.items.length * 26 + (order.discount > 0 ? 16 : 0);
  const doc = new PDFDocument({ size: [width, height], margin: 12 });
  doc.pipe(res);

  const center = { align: "center" as const, width: width - 24 };

  doc.font("Helvetica-Bold").fontSize(13).text("RumaCart", { ...center });
  doc.font("Helvetica").fontSize(8).text(order.point.name, { ...center });
  doc.text(order.point.address, { ...center });
  doc.moveDown(0.4);
  doc.text(new Date(order.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }), { ...center });
  doc.font("Helvetica-Bold").text(order.orderNumber, { ...center });
  doc.moveDown(0.3);
  doc.font("Helvetica").text("-".repeat(34), { ...center });

  for (const item of order.items) {
    doc.fontSize(8).text(item.product?.name || "Produk", { width: width - 24 });
    doc.text(`${item.qty} x ${formatRupiah(item.price)}`, { continued: true, width: width - 24 });
    doc.text(formatRupiah(item.subtotal), { align: "right" });
  }

  doc.text("-".repeat(34), { ...center });
  doc.fontSize(8).text(`Subtotal`, { continued: true, width: width - 24 });
  doc.text(formatRupiah(order.subtotal), { align: "right" });
  if (order.discount > 0) {
    doc.text(`Diskon`, { continued: true, width: width - 24 });
    doc.text("-" + formatRupiah(order.discount), { align: "right" });
  }
  doc.text(`Ongkir`, { continued: true, width: width - 24 });
  doc.text(formatRupiah(order.shippingCost), { align: "right" });

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`TOTAL`, { continued: true, width: width - 24 });
  doc.text(formatRupiah(order.total), { align: "right" });

  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(8).text(PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod, { ...center });
  doc.moveDown(0.5);
  doc.text("Terima kasih sudah belanja!", { ...center });

  doc.end();
}
