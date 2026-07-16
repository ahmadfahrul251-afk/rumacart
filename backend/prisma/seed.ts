/**
 * Seed data demo untuk RumaCart (Round 18: Varian Produk).
 * Jalankan dengan: npm run seed
 *
 * Struktur jaringan: 2 RDH (gudang utama, tiap kota) + 5 Mart/Point (spoke)
 * yang masing-masing punya `parentHubId` ke salah satu RDH — sesuai arsitektur
 * Hub and Spoke. 20 produk MASTER (nama, merek, kata kunci pencarian — SEMUA
 * produk nyata yang beredar di Indonesia) dibuat sebagai "induk" tanpa SKU/
 * harga (Round 18: itu semua sekarang di ProductVariant). Beberapa produk
 * FMCG yang di dunia nyata memang punya varian rasa/ukuran (Indomie, Mie
 * Sedaap, Chitato, Teh Botol Sosro) dapat lebih dari 1 ProductVariant; sisanya
 * cukup 1 varian "Default". RDH lalu "klaim" SEMUA varian dengan Harga Dasar
 * masing-masing; tiap Mart/Point cuma klaim SEBAGIAN varian (realistis — tidak
 * semua outlet jual semua barang) dengan Harga Jual (markup di atas Harga
 * Dasar RDH induknya), kadang dengan diskon. Order dummy cuma dibuat dari
 * kombinasi (Point, Varian) yang BENAR-BENAR sudah diklaim & berstok.
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const CONFIG = {
  customers: 50,
  orders: 250,
};

const CATEGORY_NAMES = [
  "Sembako", "Minuman", "Makanan Instan", "Frozen Food", "Snack",
  "Perawatan Tubuh", "Perawatan Bayi", "Peralatan Dapur", "Kebersihan Rumah",
  "Sayur Segar", "Buah Segar", "Bumbu Dapur", "Obat OTC", "Produk Herbal",
  "Roti & Kue", "Susu & Olahan", "Telur & Daging", "Kopi & Teh",
  "Peralatan Mandi", "Perlengkapan Rumah",
];

// Jaringan Hub and Spoke: 2 RDH (gudang utama per kota) + 5 spoke customer-facing.
const LOCATIONS: {
  code: string; name: string; type: "RDH" | "MART" | "POINT"; city: string;
  lat: number; lon: number; parentCode: string | null;
}[] = [
  { code: "RDH-BDG", name: "RDH RumaCart Bandung", type: "RDH", city: "Bandung", lat: -6.9175, lon: 107.6191, parentCode: null },
  { code: "RDH-JKT", name: "RDH RumaCart Jakarta", type: "RDH", city: "Jakarta", lat: -6.2088, lon: 106.8456, parentCode: null },
  { code: "MART-BDG1", name: "RumaCart Mart Dago", type: "MART", city: "Bandung", lat: -6.8915, lon: 107.6107, parentCode: "RDH-BDG" },
  { code: "POINT-BDG1", name: "RumaCart Point Buahbatu", type: "POINT", city: "Bandung", lat: -6.9489, lon: 107.6323, parentCode: "RDH-BDG" },
  { code: "MART-JKT1", name: "RumaCart Mart Kemang", type: "MART", city: "Jakarta", lat: -6.2607, lon: 106.8148, parentCode: "RDH-JKT" },
  { code: "POINT-JKT1", name: "RumaCart Point Kelapa Gading", type: "POINT", city: "Jakarta", lat: -6.1588, lon: 106.9056, parentCode: "RDH-JKT" },
  { code: "POINT-JKT2", name: "RumaCart Point Bekasi", type: "POINT", city: "Bekasi", lat: -6.2383, lon: 106.9756, parentCode: "RDH-JKT" },
];

interface VariantSeed {
  name: string; // "Default" kalau produknya tidak punya varian rasa/ukuran nyata
  weightGram: number;
  dims: [number, number, number];
  basePrice: number; // Harga Dasar acuan (dipakai referensi seeding Inventory RDH di bawah)
}

interface ProductSeed {
  name: string;
  category: string;
  brand: string | null;
  keywords: string;
  variants: VariantSeed[];
}

// 20 produk MASTER — produk nyata yang beredar luas di Indonesia. 4 di
// antaranya (Indomie Goreng, Mie Sedaap Goreng, Chitato, Teh Botol Sosro)
// sengaja dikasih beberapa VARIAN nyata (rasa/ukuran) buat mendemonstrasikan
// fitur Varian Produk Round 18 — sisanya cukup 1 varian "Default".
const PRODUCTS: ProductSeed[] = [
  {
    name: "Indomie Goreng", category: "Makanan Instan", brand: "Indomie",
    keywords: "mie instan, mie goreng, indomie, pedas",
    variants: [
      { name: "Rendang", weightGram: 85, dims: [14, 10, 2], basePrice: 3200 },
      { name: "Ayam Bawang", weightGram: 85, dims: [14, 10, 2], basePrice: 3100 },
      { name: "Ayam Geprek Sambal Matah", weightGram: 85, dims: [14, 10, 2], basePrice: 3300 },
    ],
  },
  {
    name: "Mie Sedaap Goreng", category: "Makanan Instan", brand: "Mie Sedaap",
    keywords: "mie instan, mie goreng, mie sedaap",
    variants: [
      { name: "Original", weightGram: 82, dims: [14, 10, 2], basePrice: 2900 },
      { name: "Ayam Bawang", weightGram: 82, dims: [14, 10, 2], basePrice: 2900 },
    ],
  },
  {
    name: "Beras Rojolele Premium", category: "Sembako", brand: "Rojolele",
    keywords: "beras, nasi, rojolele",
    variants: [{ name: "5kg", weightGram: 5000, dims: [40, 25, 8], basePrice: 65000 }],
  },
  {
    name: "Minyak Goreng Bimoli", category: "Sembako", brand: "Bimoli",
    keywords: "minyak goreng, bimoli",
    variants: [{ name: "Botol 2L", weightGram: 1830, dims: [9, 9, 26], basePrice: 33000 }],
  },
  {
    name: "Gula Pasir Gulaku", category: "Sembako", brand: "Gulaku",
    keywords: "gula, gula pasir, gulaku",
    variants: [{ name: "1kg", weightGram: 1000, dims: [10, 6, 20], basePrice: 15500 }],
  },
  {
    name: "Kecap Manis ABC", category: "Bumbu Dapur", brand: "ABC",
    keywords: "kecap, kecap manis, abc",
    variants: [{ name: "275ml", weightGram: 320, dims: [6, 6, 18], basePrice: 9500 }],
  },
  {
    name: "Teh Botol Sosro", category: "Minuman", brand: "Sosro",
    keywords: "teh, teh botol, sosro, minuman",
    variants: [
      { name: "450ml", weightGram: 450, dims: [6, 6, 17], basePrice: 4500 },
      { name: "350ml", weightGram: 350, dims: [6, 6, 15], basePrice: 3800 },
    ],
  },
  {
    name: "Kopi Kapal Api Special Mix", category: "Kopi & Teh", brand: "Kapal Api",
    keywords: "kopi, kapal api, kopi bubuk",
    variants: [{ name: "165g", weightGram: 165, dims: [12, 8, 3], basePrice: 11500 }],
  },
  {
    name: "Air Mineral Aqua", category: "Minuman", brand: "Aqua",
    keywords: "air mineral, aqua, minuman",
    variants: [{ name: "600ml", weightGram: 620, dims: [6, 6, 22], basePrice: 3500 }],
  },
  {
    name: "Susu UHT Ultra Milk Full Cream", category: "Susu & Olahan", brand: "Ultra Milk",
    keywords: "susu, ultra milk, susu uht, full cream",
    variants: [{ name: "1L", weightGram: 1040, dims: [7, 7, 20], basePrice: 19500 }],
  },
  {
    name: "Milo Activ-Go Bubuk", category: "Minuman", brand: "Milo",
    keywords: "milo, coklat, minuman bubuk",
    variants: [{ name: "400g", weightGram: 420, dims: [10, 10, 15], basePrice: 28500 }],
  },
  {
    name: "Chitato", category: "Snack", brand: "Chitato",
    keywords: "chitato, keripik, snack",
    variants: [
      { name: "Sapi Panggang", weightGram: 68, dims: [20, 13, 5], basePrice: 9500 },
      { name: "Balado", weightGram: 68, dims: [20, 13, 5], basePrice: 9500 },
      { name: "Rasa Keju", weightGram: 68, dims: [20, 13, 5], basePrice: 9700 },
    ],
  },
  {
    name: "Sari Roti Tawar Spesial", category: "Roti & Kue", brand: "Sari Roti",
    keywords: "roti, roti tawar, sari roti",
    variants: [{ name: "Default", weightGram: 360, dims: [20, 11, 10], basePrice: 14500 }],
  },
  {
    name: "Telur Ayam Negeri", category: "Telur & Daging", brand: null,
    keywords: "telur, telur ayam, protein",
    variants: [{ name: "1kg", weightGram: 1000, dims: [25, 15, 6], basePrice: 28000 }],
  },
  {
    name: "Sabun Mandi Lifebuoy", category: "Perawatan Tubuh", brand: "Lifebuoy",
    keywords: "sabun, sabun mandi, lifebuoy",
    variants: [{ name: "85g", weightGram: 85, dims: [7, 4, 3], basePrice: 4200 }],
  },
  {
    name: "Pasta Gigi Pepsodent", category: "Perawatan Tubuh", brand: "Pepsodent",
    keywords: "pasta gigi, odol, pepsodent",
    variants: [{ name: "190g", weightGram: 210, dims: [4, 4, 18], basePrice: 9800 }],
  },
  {
    name: "Deterjen Bubuk Rinso", category: "Kebersihan Rumah", brand: "Rinso",
    keywords: "deterjen, rinso, cuci baju",
    variants: [{ name: "800g", weightGram: 800, dims: [20, 13, 5], basePrice: 17500 }],
  },
  {
    name: "Sabun Cuci Piring Sunlight", category: "Kebersihan Rumah", brand: "Sunlight",
    keywords: "sabun cuci piring, sunlight",
    variants: [{ name: "800ml", weightGram: 860, dims: [8, 6, 22], basePrice: 9200 }],
  },
  {
    name: "Pewangi Pakaian Downy", category: "Kebersihan Rumah", brand: "Downy",
    keywords: "pewangi, downy, parfum baju",
    variants: [{ name: "800ml", weightGram: 850, dims: [8, 6, 22], basePrice: 24500 }],
  },
  {
    name: "Pembalut Charm Comfort Extra Wing", category: "Perawatan Tubuh", brand: "Charm",
    keywords: "pembalut, charm, wanita",
    variants: [{ name: "Default", weightGram: 110, dims: [15, 10, 4], basePrice: 15500 }],
  },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}
function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
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

  // 2. Fulfillment Points — RDH dulu (tidak punya induk), baru spoke (Mart/Point)
  //    yang referensi parentHubId ke RDH-nya.
  const pointByCode = new Map<string, any>();
  for (const loc of LOCATIONS.filter((l) => l.type === "RDH")) {
    const point = await prisma.fulfillmentPoint.upsert({
      where: { code: loc.code },
      update: {},
      create: {
        name: loc.name,
        code: loc.code,
        type: loc.type,
        address: `Kawasan Pergudangan, ${loc.city}`,
        city: loc.city,
        latitude: loc.lat,
        longitude: loc.lon,
        phone: `08${rand(1000000000, 1999999999)}`,
        operatingHours: "24 jam",
      },
    });
    pointByCode.set(loc.code, point);
  }
  for (const loc of LOCATIONS.filter((l) => l.type !== "RDH")) {
    const parent = pointByCode.get(loc.parentCode!);
    const point = await prisma.fulfillmentPoint.upsert({
      where: { code: loc.code },
      update: {},
      create: {
        name: loc.name,
        code: loc.code,
        type: loc.type,
        address: `Jl. Contoh No. ${rand(1, 99)}, ${loc.city}`,
        city: loc.city,
        latitude: loc.lat,
        longitude: loc.lon,
        phone: `08${rand(1000000000, 1999999999)}`,
        operatingHours: "08:00 - 21:00",
        parentHubId: parent.id,
      },
    });
    pointByCode.set(loc.code, point);
  }
  const allPoints = Array.from(pointByCode.values());
  const rdhPoints = allPoints.filter((p) => p.type === "RDH");
  const spokePoints = allPoints.filter((p) => p.type !== "RDH");
  console.log(`${allPoints.length} lokasi dibuat (${rdhPoints.length} RDH, ${spokePoints.length} Mart/Point)`);

  // 2b. Akun Admin Lokasi (ADMIN_POINT) — 1 per lokasi, supaya alur klaim &
  //     atur harga RDH vs Mart/Point bisa langsung dicoba dari akun demo.
  for (const point of allPoints) {
    const email = `admin.${point.code.toLowerCase()}@rumacart.com`;
    await prisma.user.upsert({
      where: { email },
      update: { managedPointId: point.id },
      create: {
        name: `Admin ${point.name}`,
        email,
        passwordHash: demoPassword,
        role: "ADMIN_POINT",
        managedPointId: point.id,
      },
    });
  }
  // Kasir demo dikunci ke Mart pertama supaya POS langsung jalan pakai harga per-Point.
  await prisma.user.update({ where: { email: "kasir@rumacart.com" }, data: { managedPointId: spokePoints[0].id } });
  console.log(`${allPoints.length} akun Admin Lokasi dibuat (admin.<kode>@rumacart.com, password: password123)`);

  // 3. Kategori
  const categoryByName = new Map<string, any>();
  for (const name of CATEGORY_NAMES) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
    categoryByName.set(name, category);
  }
  console.log(`${categoryByName.size} kategori dibuat`);

  // 4. 20 Produk Master (induk saja — nama/kategori/brand/keywords) + Varian
  //    tiap produk (SKU/barcode/dimensi ada di varian, bukan lagi di Product).
  //    `variants` flat list di bawah dipakai di semua langkah selanjutnya
  //    (klaim RDH, klaim Mart/Point, order dummy) — sesuai Round 18, semua itu
  //    sekarang per VARIAN, bukan per produk.
  const variants: { id: string; productId: string; basePrice: number }[] = [];
  for (const p of PRODUCTS) {
    const category = categoryByName.get(p.category);
    const product = await prisma.product.upsert({
      where: { slug: slugify(p.name) },
      update: {},
      create: {
        name: p.name,
        slug: slugify(p.name),
        description: `${p.name}${p.brand ? ` dari ${p.brand}` : ""} — produk kebutuhan harian, tersedia di RumaCart.`,
        categoryId: category.id,
        brand: p.brand,
        searchKeywords: p.keywords,
        minStock: 10,
        images: [],
      },
    });

    for (const v of p.variants) {
      const skuBase = slugify(p.brand || p.name).slice(0, 8).toUpperCase();
      const variantSuffix = slugify(v.name).slice(0, 6).toUpperCase();
      const sku = `SKU-${skuBase}-${variantSuffix}-${rand(100, 999)}`;
      const variant = await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          name: v.name,
          sku,
          barcode: `899${rand(1000000000, 1999999999)}`,
          weightGram: v.weightGram,
          lengthCm: v.dims[0],
          widthCm: v.dims[1],
          heightCm: v.dims[2],
          minStock: 10,
        },
      });
      variants.push({ id: variant.id, productId: product.id, basePrice: v.basePrice });
    }
  }
  console.log(`${PRODUCTS.length} produk master + ${variants.length} varian dibuat (real, tanpa harga)`);

  // 5. RDH klaim SEMUA varian dengan Harga Dasar masing-masing.
  //    parentBasePrice disimpan per (rdhId, variantId) supaya bisa dipakai
  //    referensi markup Mart/Point di langkah 6.
  const rdhBasePrice = new Map<string, Map<string, number>>(); // rdhId -> variantId -> basePrice
  for (const rdh of rdhPoints) {
    const map = new Map<string, number>();
    rdhBasePrice.set(rdh.id, map);
    for (const v of variants) {
      // Sedikit variasi harga dasar antar kota (biaya distribusi beda).
      const basePrice = roundTo(v.basePrice * (0.97 + Math.random() * 0.08), 100);
      await prisma.inventory.upsert({
        where: { variantId_pointId: { variantId: v.id, pointId: rdh.id } },
        update: {},
        create: { variantId: v.id, pointId: rdh.id, stock: rand(80, 400), minStock: 20, basePrice },
      });
      map.set(v.id, basePrice);
    }
  }
  console.log(`RDH klaim semua ${variants.length} varian (Harga Dasar diatur tiap RDH)`);

  // 6. Tiap Mart/Point klaim SEBAGIAN varian (realistis — bukan semua outlet
  //    jual semua barang) dengan Harga Jual = markup dari Harga Dasar RDH
  //    induknya, kadang dengan Harga Diskon.
  const spokeClaims: { pointId: string; variantId: string; price: number; stock: number }[] = [];
  for (const spoke of spokePoints) {
    const parentMap = rdhBasePrice.get(spoke.parentHubId as string);
    if (!parentMap) continue;
    const shuffled = [...variants].sort(() => Math.random() - 0.5);
    const claimCount = rand(Math.floor(variants.length * 0.6), variants.length); // klaim ~60-100% varian
    const claimed = shuffled.slice(0, claimCount);

    for (const v of claimed) {
      const basePrice = parentMap.get(v.id)!;
      const sellPrice = roundTo(basePrice * (1.12 + Math.random() * 0.18), 100);
      const hasDiscount = Math.random() < 0.25;
      const discountPrice = hasDiscount ? roundTo(sellPrice * 0.9, 100) : null;
      const stock = Math.random() < 0.1 ? 0 : rand(5, 80);

      await prisma.inventory.upsert({
        where: { variantId_pointId: { variantId: v.id, pointId: spoke.id } },
        update: {},
        create: {
          variantId: v.id, pointId: spoke.id, stock, minStock: 10,
          basePrice, sellPrice, discountPrice,
        },
      });

      if (stock > 0) {
        spokeClaims.push({ pointId: spoke.id, variantId: v.id, price: discountPrice ?? sellPrice, stock });
      }
    }
  }
  console.log(`${spokePoints.length} Mart/Point klaim varian (Harga Jual = markup dari Harga Dasar RDH induk)`);

  // 7. Customer + alamat
  const customers = [];
  for (let i = 0; i < CONFIG.customers; i++) {
    const point = pick(spokePoints);
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
        kecamatan: null,
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

  // 8. Order dummy — HANYA dari kombinasi (Point, Varian) yang benar-benar
  //    sudah diklaim & berstok (dari spokeClaims di langkah 6), pakai harga
  //    (sellPrice/discountPrice) sungguhan di lokasi itu. Order + item id
  //    di-generate manual (randomUUID) supaya bisa dipakai createMany.
  const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "SHIPPED", "PROCESSED", "PENDING", "CANCELLED"];

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

  if (spokeClaims.length > 0) {
    for (let i = 0; i < CONFIG.orders; i++) {
      const customer = pick(customers);
      const address = addressByUser.get(customer.id);
      // Pilih 1 klaim acak sebagai "anchor" Point pesanan ini, lalu ambil 1-3
      // item TAMBAHAN yang juga tersedia di Point yang sama (kalau ada).
      const anchor = pick(spokeClaims);
      const sameSpokeClaims = spokeClaims.filter((c) => c.pointId === anchor.pointId);
      const itemCount = Math.min(rand(1, 3), sameSpokeClaims.length);
      const chosen = [...sameSpokeClaims].sort(() => Math.random() - 0.5).slice(0, itemCount);

      let subtotal = 0;
      const items = chosen.map((c) => {
        const qty = rand(1, Math.min(3, Math.max(1, c.stock)));
        const lineSubtotal = c.price * qty;
        subtotal += lineSubtotal;
        return { variantId: c.variantId, qty, price: c.price, subtotal: lineSubtotal };
      });
      if (items.length === 0) continue;

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
        pointId: anchor.pointId,
        addressId: address?.id,
        status: status as any,
        shippingMethod: pick(["PICKUP", "DELIVERY"]) as any,
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
          pointId: anchor.pointId,
          refType: "ORDER",
          refId: orderId,
          createdAt,
        });
      }
    }
  }

  const CHUNK = 100;
  for (let i = 0; i < orderRows.length; i += CHUNK) {
    await prisma.order.createMany({ data: orderRows.slice(i, i + CHUNK) });
  }
  for (let i = 0; i < orderItemRows.length; i += CHUNK) {
    await prisma.orderItem.createMany({ data: orderItemRows.slice(i, i + CHUNK) });
  }
  console.log(`${orderRows.length} order dummy dibuat (cuma dari kombinasi Point-Varian yang benar-benar diklaim)`);

  // 9. Pengeluaran operasional dummy — ditambahkan ke cashflowRows yang sama,
  //    lalu semua cashflow (penjualan + pengeluaran) di-insert sekaligus.
  const expenseCategories = ["Gaji", "Marketing", "Transport", "Listrik", "Air", "Internet", "Belanja Supplier"];
  for (let i = 0; i < 60; i++) {
    const daysAgo = rand(0, 180);
    cashflowRows.push({
      id: randomUUID(),
      type: "OUT",
      category: pick(expenseCategories),
      amount: rand(200000, 5000000),
      description: "Pengeluaran operasional (dummy)",
      pointId: pick(allPoints).id,
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
