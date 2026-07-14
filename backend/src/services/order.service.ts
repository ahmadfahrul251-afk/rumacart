import { prisma } from "../config/db";
import { selectBestPoint, CartLine } from "./pointSelector.service";
import { recordCashflow } from "./cashflow.service";
import { calcVoucherDiscount } from "./voucher.service";

interface CreateOrderInput {
  customerId: string;
  addressId?: string;
  items: CartLine[];
  shippingMethod: "PICKUP" | "INSTANT" | "SAME_DAY";
  paymentMethod: "COD" | "TRANSFER" | "EWALLET";
  voucherCode?: string;
  notes?: string;
}

const SHIPPING_COST: Record<string, number> = {
  PICKUP: 0,
  SAME_DAY: 9000,
  INSTANT: 15000,
};

export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length) throw new Error("Keranjang kosong");

  // 1. Ambil data produk & harga terbaru dari database (jangan percaya harga dari frontend).
  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) } },
  });
  const productMap = new Map(products.map((p: any) => [p.id, p]));

  // 2. Tentukan alamat customer (untuk cari Point terdekat).
  let lat: number | null = null;
  let lon: number | null = null;
  let city: string | null = null;
  if (input.addressId) {
    const address = await prisma.address.findUnique({ where: { id: input.addressId } });
    if (address) {
      lat = address.latitude;
      lon = address.longitude;
      city = address.city;
    }
  }

  // 3. FITUR UTAMA: pilih Point terdekat yang stoknya cukup.
  const pointId = await selectBestPoint(input.items, lat, lon, city);

  // 4. Hitung subtotal berdasarkan harga di database (bukan dari client).
  //    Sekaligus hitung total harga modal (costPrice) supaya bisa dipisahkan
  //    dari keuntungan nanti, dan dipakai untuk deteksi "jual di bawah modal".
  let subtotal = 0;
  let costTotal = 0;
  const orderItemsData = input.items.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) throw new Error(`Produk ${line.productId} tidak ditemukan`);
    const price = product.discountPrice ?? product.sellPrice;
    const lineSubtotal = price * line.qty;
    subtotal += lineSubtotal;
    costTotal += product.costPrice * line.qty;
    return { productId: product.id, qty: line.qty, price, subtotal: lineSubtotal };
  });

  // 5. Voucher (opsional, mendukung potongan flat maupun persen dengan batas maksimal).
  let discount = 0;
  let voucherId: string | undefined;
  if (input.voucherCode) {
    const voucher = await prisma.voucher.findUnique({ where: { code: input.voucherCode } });
    const notExpired = !voucher?.expiresAt || voucher.expiresAt >= new Date();
    if (voucher && voucher.isActive && voucher.used < voucher.quota && subtotal >= voucher.minPurchase && notExpired) {
      discount = calcVoucherDiscount(voucher, subtotal);
      voucherId = voucher.id;
    }
  }

  const shippingCost = SHIPPING_COST[input.shippingMethod] ?? 0;
  const total = Math.max(subtotal + shippingCost - discount, 0);
  const orderNumber = generateOrderNumber();

  // Kalau harga produk (setelah diskon voucher) sudah tidak menutup harga modal,
  // tandai order ini supaya Admin sadar cash bisnisnya "tergerus" oleh diskon.
  const belowCost = subtotal - discount < costTotal;

  // 6. Simpan order + kurangi stok di Point terpilih, dalam satu transaction
  //    supaya konsisten (kalau salah satu gagal, semua dibatalkan).
  const order = await prisma.$transaction(async (tx: any) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: input.customerId,
        pointId,
        addressId: input.addressId,
        voucherId,
        shippingMethod: input.shippingMethod,
        paymentMethod: input.paymentMethod,
        subtotal,
        shippingCost,
        discount,
        total,
        costTotal,
        belowCost,
        notes: input.notes,
        items: { create: orderItemsData },
        payment: { create: { method: input.paymentMethod, amount: total, status: "PENDING" } },
        statusHistory: { create: { status: "PENDING" } },
      },
      include: { items: true, payment: true, point: true },
    });

    for (const line of input.items) {
      const inv = await tx.inventory.update({
        where: { productId_pointId: { productId: line.productId, pointId } },
        data: { stock: { decrement: line.qty } },
      });
      await tx.inventoryHistory.create({
        data: {
          inventoryId: inv.id,
          type: "SALE",
          qty: line.qty,
          note: `Order ${orderNumber}`,
          refId: created.id,
        },
      });
    }

    if (voucherId) {
      await tx.voucher.update({ where: { id: voucherId }, data: { used: { increment: 1 } } });
    }

    return created;
  }, {
    // Default Prisma cuma kasih 5 detik untuk 1 transaksi. Database gratis (Neon)
    // kadang butuh waktu lebih lama untuk "bangun"/merespons, jadi kita naikkan
    // batas waktunya supaya checkout tidak gagal di percobaan pertama.
    maxWait: 10000,
    timeout: 20000,
  });

  // 7. Catat cashflow masuk dari penjualan ini (sistem "Kantong"/Pocket Cashflow).
  //    Uang yang benar-benar masuk tetap `total` (akurat untuk hitung saldo kas
  //    perusahaan), tapi otomatis kebagi 2 kantong sekaligus:
  //    - costTotal (harga modal)  -> Kantong Inventaris (buat belanja stok/supplier)
  //    - profitAmount (untung)    -> Kantong Profit (buat pengembangan usaha/bonus/dividen)
  const profitAmount = total - costTotal;

  await recordCashflow({
    type: "IN",
    category: "Penjualan",
    amount: total,
    costAmount: costTotal,
    profitAmount,
    description: `Order ${orderNumber}${belowCost ? " (di bawah modal!)" : ""}`,
    pointId,
    refType: "ORDER",
    refId: order.id,
  });

  return order;
}

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RC-${y}${m}${d}-${rand}`;
}
