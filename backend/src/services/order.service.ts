import { prisma } from "../config/db";
import { selectBestPoint, pointHasStockForCart, findBackOrderOption, CartLine } from "./pointSelector.service";
import { recordCashflow } from "./cashflow.service";
import { calcVoucherDiscount } from "./voucher.service";
import { checkAndCreateRestockRequest } from "./restockRequest.service";
import { getDeliveryCost } from "./deliveryArea.service";

interface CreateOrderInput {
  customerId: string;
  addressId?: string;
  items: CartLine[];
  shippingMethod: "PICKUP" | "DELIVERY";
  paymentMethod: "COD" | "TRANSFER" | "EWALLET";
  voucherCode?: string;
  notes?: string;
  // Opsional: customer pilih sendiri Point-nya di halaman checkout (dari daftar
  // /points/eligible). Kalau kosong, sistem tetap otomatis pilih Point terdekat
  // yang stoknya cukup (perilaku lama, dipakai juga sebagai fallback).
  pointId?: string;
}

export async function createOrder(input: CreateOrderInput) {
  if (!input.items.length) throw new Error("Keranjang kosong");

  // 2. Tentukan alamat customer (untuk cari Point terdekat + cek jangkauan kurir).
  let lat: number | null = null;
  let lon: number | null = null;
  let city: string | null = null;
  let kecamatan: string | null = null;
  if (input.addressId) {
    const address = await prisma.address.findUnique({ where: { id: input.addressId } });
    if (address) {
      lat = address.latitude;
      lon = address.longitude;
      city = address.city;
      kecamatan = address.kecamatan;
    }
  }

  // 3. Tentukan lokasi pemenuhan pesanan (Smart Order Routing).
  //    Kalau customer sudah pilih sendiri (dari dropdown di checkout, termasuk
  //    opsi Back Order dari RDH kalau Point/Mart kosong semua), pakai itu — tapi
  //    tetap divalidasi ulang stoknya di sini (jangan percaya begitu saja data
  //    dari client, bisa saja sudah berubah/kehabisan sejak halaman dibuka).
  //    Kalau tidak pilih: coba Point/Mart terdekat dulu, baru fallback RDH (Back Order).
  let pointId: string;
  let isBackOrder = false;
  if (input.pointId) {
    const stillHasStock = await pointHasStockForCart(input.pointId, input.items);
    if (!stillHasStock) {
      throw new Error("Stok di lokasi yang dipilih sudah tidak mencukupi, silakan pilih lokasi lain");
    }
    pointId = input.pointId;
    const chosenLocation = await prisma.fulfillmentPoint.findUnique({ where: { id: pointId } });
    isBackOrder = chosenLocation?.type === "RDH";
  } else {
    try {
      pointId = await selectBestPoint(input.items, lat, lon, city);
    } catch {
      const backOrder = await findBackOrderOption(input.items, lat, lon, city);
      if (!backOrder) throw new Error("Stok habis di seluruh jaringan untuk pesanan ini");
      pointId = backOrder.pointId;
      isBackOrder = true;
    }
  }

  // 4. Hitung subtotal berdasarkan harga di database (bukan dari client) —
  //    harga sekarang per LOKASI (Inventory), bukan lagi 1 harga global di
  //    Product. Fallback discountPrice -> sellPrice -> basePrice: kasus normal
  //    (Mart/Point) selalu punya sellPrice; kasus Back Order (RDH, lihat poin 3)
  //    RDH cuma punya basePrice (tidak jual langsung ke customer), jadi dipakai
  //    apa adanya sebagai harga darurat. Sekaligus hitung total harga modal
  //    (basePrice) supaya bisa dipisahkan dari keuntungan nanti, dan dipakai
  //    untuk deteksi "jual di bawah modal".
  const inventoryRows = await prisma.inventory.findMany({
    where: { pointId, productId: { in: input.items.map((i) => i.productId) } },
  });
  const invMap = new Map(inventoryRows.map((inv: any) => [inv.productId, inv]));

  let subtotal = 0;
  let costTotal = 0;
  const orderItemsData = input.items.map((line) => {
    const inv: any = invMap.get(line.productId);
    if (!inv) throw new Error(`Produk ${line.productId} tidak tersedia di lokasi ini`);
    const price = inv.discountPrice ?? inv.sellPrice ?? inv.basePrice;
    if (price == null) throw new Error(`Harga produk di lokasi ini belum diatur`);
    const cost = inv.basePrice ?? 0;
    const lineSubtotal = price * line.qty;
    subtotal += lineSubtotal;
    costTotal += cost * line.qty;
    return { productId: line.productId, qty: line.qty, price, subtotal: lineSubtotal };
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

  // 5b. Ongkir: PICKUP selalu gratis. DELIVERY dihitung dari DeliveryArea milik
  //     Point ini yang cocok dengan kecamatan alamat tujuan — kalau Point ini
  //     tidak melayani kecamatan itu, DELIVERY ditolak (customer perlu pilih
  //     PICKUP atau Point lain yang menjangkau).
  let shippingCost = 0;
  if (input.shippingMethod === "DELIVERY") {
    const quote = await getDeliveryCost(pointId, kecamatan, city);
    if (!quote.available) {
      throw new Error("Point ini tidak melayani pengiriman ke kecamatan alamat tujuanmu, pilih Pickup atau Point lain");
    }
    shippingCost = quote.cost;
  }
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
        isBackOrder,
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

  // 8. Smart Restock: cek tiap produk yang baru laku, kalau stoknya di lokasi ini
  //    sudah turun sampai/di bawah minStock, sistem otomatis bikin Restock Request.
  //    Dijalankan di luar transaction utama (bukan bagian kritis checkout — kalau
  //    gagal pun order tetap sukses, cuma restock request-nya tidak sempat dibuat).
  for (const line of input.items) {
    await checkAndCreateRestockRequest(line.productId, pointId).catch(() => {});
  }

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
