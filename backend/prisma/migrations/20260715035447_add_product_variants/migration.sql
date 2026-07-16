-- Round 18: Varian Produk.
--
-- CATATAN PENTING: migrasi ini ditulis ulang secara manual (bukan hasil mentah
-- `prisma migrate dev`) supaya AMAN dijalankan di database yang sudah ada
-- datanya (production) — kolom variantId yang wajib diisi TIDAK ditambahkan
-- langsung sebagai NOT NULL, tapi lewat 3 langkah per tabel:
--   1. tambah kolom variantId dulu (boleh kosong)
--   2. isi otomatis (backfill) dari data productId lama
--   3. baru wajibkan (NOT NULL)
-- Tidak ada data yang hilang. Kalau dijalankan di database kosong (dev
-- setelah `migrate reset`), langkah backfill-nya cuma tidak berpengaruh apa-apa.

-- 1) Tabel product_variants dulu (independen, belum menyentuh tabel lain)
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "weightGram" INTEGER NOT NULL DEFAULT 0,
    "lengthCm" DOUBLE PRECISION,
    "widthCm" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- 2) Setiap produk lama otomatis dapat 1 varian "Default" yang mewarisi
-- SKU/barcode/dimensi lamanya (masih ada di kolom products di titik ini).
-- id varian dibuat deterministik ('variant_' + id produk) supaya baris di
-- tabel lain gampang di-backfill lewat penggabungan string, tanpa perlu
-- ekstensi UUID tambahan.
INSERT INTO "product_variants" ("id", "productId", "name", "sku", "barcode", "weightGram", "lengthCm", "widthCm", "heightCm", "minStock", "isActive", "createdAt", "updatedAt")
SELECT 'variant_' || p."id", p."id", 'Default', p."sku", p."barcode", p."weightGram", p."lengthCm", p."widthCm", p."heightCm", p."minStock", p."isActive", p."createdAt", CURRENT_TIMESTAMP
FROM "products" p;

-- 3) inventory
ALTER TABLE "inventory" ADD COLUMN "variantId" TEXT;
UPDATE "inventory" SET "variantId" = 'variant_' || "productId";
ALTER TABLE "inventory" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_productId_fkey";
DROP INDEX "inventory_productId_pointId_key";
ALTER TABLE "inventory" DROP COLUMN "productId";
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "inventory_variantId_pointId_key" ON "inventory"("variantId", "pointId");

-- 4) order_items
ALTER TABLE "order_items" ADD COLUMN "variantId" TEXT;
UPDATE "order_items" SET "variantId" = 'variant_' || "productId";
ALTER TABLE "order_items" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_fkey";
ALTER TABLE "order_items" DROP COLUMN "productId";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5) purchase_order_items
ALTER TABLE "purchase_order_items" ADD COLUMN "variantId" TEXT;
UPDATE "purchase_order_items" SET "variantId" = 'variant_' || "productId";
ALTER TABLE "purchase_order_items" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "purchase_order_items" DROP CONSTRAINT "purchase_order_items_productId_fkey";
ALTER TABLE "purchase_order_items" DROP COLUMN "productId";
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) stock_transfer_items
ALTER TABLE "stock_transfer_items" ADD COLUMN "variantId" TEXT;
UPDATE "stock_transfer_items" SET "variantId" = 'variant_' || "productId";
ALTER TABLE "stock_transfer_items" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "stock_transfer_items" DROP CONSTRAINT "stock_transfer_items_productId_fkey";
ALTER TABLE "stock_transfer_items" DROP COLUMN "productId";
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7) restock_requests
ALTER TABLE "restock_requests" ADD COLUMN "variantId" TEXT;
UPDATE "restock_requests" SET "variantId" = 'variant_' || "productId";
ALTER TABLE "restock_requests" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "restock_requests" DROP CONSTRAINT "restock_requests_productId_fkey";
ALTER TABLE "restock_requests" DROP COLUMN "productId";
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8) baru sekarang aman hapus kolom lama di products (semua sudah dipindah ke product_variants)
DROP INDEX "products_barcode_key";
DROP INDEX "products_sku_key";
ALTER TABLE "products" DROP COLUMN "barcode",
DROP COLUMN "heightCm",
DROP COLUMN "lengthCm",
DROP COLUMN "sku",
DROP COLUMN "weightGram",
DROP COLUMN "widthCm";

-- 9) FK + index terakhir untuk product_variants sendiri
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");
