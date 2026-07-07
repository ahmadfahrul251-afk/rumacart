/**
 * Seed data dummy untuk demo MVP RumaCart.
 * Jalankan dengan: npm run seed
 *
 * Catatan: jumlah data mengikuti spesifikasi (20 kategori, 100 produk,
 * 5 Point, 50 customer, 300 order). Kalau di komputermu terasa lambat,
 * kecilkan angka di CONFIG di bawah.
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const CONFIG = {
  categories: 20,
  productsPerCategory: 5, // 20 x 5 = 100 produk
  points: 5,
  customers: 50,
  orders: 300,
};

const CATEGORY_NAMES = [
  "Sembako", "Minuman", "Makanan Instan", "Frozen Food", "Snack",
  "Perawatan Tubuh", "Perawatan Bayi", "Peralatan Dapur", "Kebersihan Rumah",
  "Sayur Segar", "Buah Segar", "Bumbu Dapur", "Obat OTC", "Produk Herbal",
  "Roti & Kue", "Susu & Olahan", "Telur & Daging", "Kopi & Teh",
  "Peralatan Mandi", "Perlengkapan Rumah",
];

const POINT_CITIES = [
  { name: "RumaCart Point A - Bandung Kota", city: "Bandung", lat: -6.9175, lon: 107.6191 },
  { name: "RumaCart Point B - Bandung Timur", city: "Bandung", lat: -6.9034, lon: 107.6675 },
  { name: "RumaCart Point C - Jakarta Selatan", city: "Jakarta", lat: -6.2615, lon: 106.8106 },
  { name: "RumaCart Point D - Surabaya", city: "Surabaya", lat: -7.2575, lon: 112.7521 },
  { name: "RumaCart Point E - Yogyakarta", city: "Yogyakarta", lat: -7.7956, lon: 110.3695 },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}
function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function main() {
  console.log("Mulai seeding...");

  // 1. Super Admin + akun demo tiap role (password sama semua untuk kemudahan testing)
  const demoPassword = await hashPassword("password123");
  const demoUsers = [
    { name: "Super Admin", email: "superadmin@rumacart.com", role: "SUPER_ADMIN" as const },
    { name: "Admin RumaCart", email: "admin@rumacart.com", role: "ADMIN" as const },
    { name: "Kasir Demo", email: "kasir@rumacart.com", role: "KASIR" as const },
    { name: "Gudang Demo", email: "gudang@rumacart.com", role: "GUDANG" as const },
    { name: "Kurir Demo", email: "kurir@rumacart.com", role: "KURIR" as const },
    { name: "Customer Demo", email: "customer@rumacart.com", role: "CUSTOMER" as const },
  ];
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: demoPassword },
    });
  }
  console.log(`${demoUsers.length} akun demo dibuat (password: password123)`);

  // 2. Fulfillment Points
  const points = [];
  for (let i = 0; i < CONFIG.points; i++) {
    const p = POINT_CITIES[i];
    const point = await prisma.fulfillmentPoint.upsert({
      where: { code: `PNT-${String.fromCharCode(65 + i)}` },
      update: {},
      create: {
        name: p.name,
        code: `PNT-${String.fromCharCode(65 + i)}`,
        address: `Jl. Contoh No. ${rand(1, 99)}, ${p.city}`,
        city: p.city,
        latitude: p.lat,
        longitude: p.lon,
        phone: `08${rand(1000000000, 1999999999)}`,
      },
    });
    points.push(point);
  }
  console.log(`${points.length} Fulfillment Point dibuat`);

  // 3. Kategori
  const categories = [];
  for (let i = 0; i < CONFIG.categories; i++) {
    const name = CATEGORY_NAMES[i] || `Kategori ${i + 1}`;
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
    categories.push(category);
  }
  console.log(`${categories.length} kategori dibuat`);

  // 4. Produk + stok per Point
  // Catatan: inventory TIDAK dibuat satu-satu di dalam loop (itu bisa 500+
  // round-trip terpisah ke database dan gampang putus kalau koneksi ke DB
  // lewat internet, misalnya Neon). Sebagai gantinya, semua baris inventory
  // dikumpulkan dulu lalu di-insert sekaligus pakai createMany di akhir.
  const products: any[] = [];
  const inventoryRows: { productId: string; pointId: string; stock: number; minStock: number }[] = [];

  for (const category of categories) {
    for (let i = 0; i < CONFIG.productsPerCategory; i++) {
      const name = `${category.name} Premium ${i + 1}`;
      const sku = `SKU-${slugify(category.name).slice(0, 4).toUpperCase()}-${i + 1}-${rand(100, 999)}`;
      const costPrice = rand(5000, 40000);
      const sellPrice = Math.round(costPrice * (1.2 + Math.random() * 0.3));
      const hasDiscount = Math.random() < 0.25;

      const product = await prisma.product.create({
        data: {
          name,
          slug: slugify(`${name}-${sku}`),
          description: `${name} — produk kebutuhan harian berkualitas dari kategori ${category.name}.`,
          categoryId: category.id,
          brand: pick(["RumaCart Basic", "Sejahtera", "Berkah Jaya", "Nusantara", "PrimaFresh"]),
          sku,
          barcode: `899${rand(1000000000, 1999999999)}`,
          weightGram: rand(100, 2000),
          costPrice,
          sellPrice,
          discountPrice: hasDiscount ? Math.round(sellPrice * 0.85) : null,
          minStock: 10,
          images: [],
        },
      });
      products.push(product);

      for (const point of points) {
        const stock = Math.random() < 0.1 ? 0 : Math.random() < 0.15 ? rand(1, 9) : rand(20, 150);
        inventoryRows.push({ productId: product.id, pointId: point.id, stock, minStock: 10 });
      }
    }
  }

  // Insert semua inventory sekaligus, dipecah per 100 baris supaya query-nya
  // tidak terlalu besar dalam satu kali kirim.
  const INVENTORY_CHUNK = 100;
  for (let i = 0; i < inventoryRows.length; i += INVENTORY_CHUNK) {
    const chunk = inventoryRows.slice(i, i + INVENTORY_CHUNK);
    await prisma.inventory.createMany({ data: chunk, skipDuplicates: true });
  }

  console.log(`${products.length} produk dibuat, masing-masing dengan stok di ${points.length} Point`);

  // 5. Customer + alamat
  const customers = [];
  for (let i = 0; i < CONFIG.customers; i++) {
    const point = pick(points);
    const email = `customer${i + 1}@mail.com`;
    const customer = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `Customer ${i + 1}`,
        email,
        phone: `08${rand(1000000000, 1999999999)}`,
        passwordHash: demoPassword,
        role: "CUSTOMER",
      },
    });
    await prisma.address.create({
      data: {
        userId: customer.id,
        label: "Rumah",
        recipientName: customer.name,
        phone: customer.phone || "",
        fullAddress: `Jl. Mawar No. ${rand(1, 50)}, dekat ${point.name}`,
        city: point.city,
        province: "-",
        latitude: point.latitude + (Math.random() - 0.5) * 0.05,
        longitude: point.longitude + (Math.random() - 0.5) * 0.05,
        isDefault: true,
      },
    });
    customers.push(customer);
  }
  console.log(`${customers.length} customer + alamat dibuat`);

  // 6. Order dummy — sama seperti inventory, semua dikumpulkan dulu di memory
  // lalu di-insert lewat createMany secara berkelompok. Karena createMany tidak
  // mendukung nested relation (order + item sekaligus), id-nya kita generate
  // sendiri (randomUUID) supaya order dan order item bisa disambungkan manual.
  const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "SHIPPED", "PROCESSED", "PENDING", "CANCELLED"];

  // Ambil semua alamat customer dalam 1 query, bukan 1 query per order.
  const allAddresses = await prisma.address.findMany({
    where: { userId: { in: customers.map((c) => c.id) } },
  });
  const addressByUser = new Map<string, (typeof allAddresses)[number]>();
  for (const addr of allAddresses) {
    if (!addressByUser.has(addr.userId)) addressByUser.set(addr.userId, addr);
  }

  const orderRows: any[] = [];
  const orderItemRows: any[] = [];
  const cashflowRows: any[] = [];

  for (let i = 0; i < CONFIG.orders; i++) {
    const customer = pick(customers);
    const address = addressByUser.get(customer.id);
    const point = pick(points);
    const itemCount = rand(1, 4);
    const chosenProducts = Array.from({ length: itemCount }, () => pick(products));

    let subtotal = 0;
    const items = chosenProducts.map((p) => {
      const qty = rand(1, 3);
      const price = p.discountPrice ?? p.sellPrice;
      const lineSubtotal = price * qty;
      subtotal += lineSubtotal;
      return { productId: p.id, qty, price, subtotal: lineSubtotal };
    });

    const shippingCost = pick([0, 9000, 15000]);
    const total = subtotal + shippingCost;
    const daysAgo = rand(0, 180);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const status = pick(statuses);
    const orderId = randomUUID();
    const orderNumber = `RC-SEED-${i + 1}-${rand(1000, 9999)}`;

    orderRows.push({
      id: orderId,
      orderNumber,
      customerId: customer.id,
      pointId: point.id,
      addressId: address?.id,
      status: status as any,
      shippingMethod: pick(["PICKUP", "INSTANT", "SAME_DAY"]) as any,
      paymentMethod: pick(["COD", "TRANSFER", "EWALLET"]) as any,
      subtotal,
      shippingCost,
      discount: 0,
      total,
      createdAt,
    });

    for (const it of items) {
      orderItemRows.push({ id: randomUUID(), orderId, ...it });
    }

    if (status === "COMPLETED") {
      cashflowRows.push({
        id: randomUUID(),
        type: "IN",
        category: "Penjualan",
        amount: total,
        description: `Order ${orderNumber}`,
        pointId: point.id,
        refType: "ORDER",
        refId: orderId,
        createdAt,
      });
    }
  }

  const CHUNK = 100;
  for (let i = 0; i < orderRows.length; i += CHUNK) {
    await prisma.order.createMany({ data: orderRows.slice(i, i + CHUNK) });
  }
  for (let i = 0; i < orderItemRows.length; i += CHUNK) {
    await prisma.orderItem.createMany({ data: orderItemRows.slice(i, i + CHUNK) });
  }
  console.log(`${orderRows.length} order dummy dibuat`);

  // 7. Pengeluaran operasional dummy — ditambahkan ke cashflowRows yang sama,
  // lalu semua cashflow (penjualan + pengeluaran) di-insert sekaligus.
  const expenseCategories = ["Gaji", "Marketing", "Transport", "Listrik", "Air", "Internet", "Belanja Supplier"];
  for (let i = 0; i < 60; i++) {
    const daysAgo = rand(0, 180);
    cashflowRows.push({
      id: randomUUID(),
      type: "OUT",
      category: pick(expenseCategories),
      amount: rand(200000, 5000000),
      description: "Pengeluaran operasional (dummy)",
      pointId: pick(points).id,
      createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    });
  }

  for (let i = 0; i < cashflowRows.length; i += CHUNK) {
    await prisma.cashflow.createMany({ data: cashflowRows.slice(i, i + CHUNK) });
  }
  console.log(`${cashflowRows.length} entri cashflow dibuat (penjualan + pengeluaran)`);

  console.log("Seeding selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });