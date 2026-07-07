# RumaCart — MVP Fase 1

"Belanja kebutuhan rumah tangga tanpa harus keluar rumah."

Ini adalah pondasi MVP RumaCart: e-commerce dengan konsep Multi Fulfillment Point (bukan marketplace). Dokumen ini menuntunmu menjalankan project di komputer sendiri, langkah demi langkah.

Sebelum lanjut, pastikan kamu sudah menyelesaikan `00-PANDUAN-INSTALASI.md` di folder induk (Node.js, PostgreSQL, VS Code, Git semua sudah terinstall dan tercek).

## Struktur Folder

```
rumacart/
├── backend/              # REST API — Express + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma # Definisi seluruh tabel database
│   │   └── seed.ts       # Script generate data dummy
│   └── src/
│       ├── config/       # Koneksi database
│       ├── middleware/   # Auth (JWT) & error handler
│       ├── routes/       # Definisi endpoint /api/...
│       ├── controllers/  # Logic tiap endpoint
│       ├── services/     # Logic bisnis (pilih Point terdekat, dll)
│       └── utils/        # Helper (hash password, format response, dll)
└── frontend/              # Next.js + TypeScript + TailwindCSS
    └── src/
        ├── app/          # Halaman (routing otomatis berdasarkan folder)
        ├── components/   # Komponen UI yang dipakai berulang
        ├── lib/          # API client, auth & cart context
        └── types/        # Definisi tipe data TypeScript
```

**Kenapa dipisah backend/frontend?** Supaya masing-masing bisa dikembangkan, di-deploy, dan di-scale secara independen. Ini pola standar aplikasi web modern.

## Langkah Menjalankan di Komputer Sendiri

### 1. Siapkan database

Buat database kosong bernama `rumacart` di PostgreSQL:

```bash
psql -U postgres -c "CREATE DATABASE rumacart;"
```

(Kalau pakai Neon/Supabase, cukup buat project baru dan salin connection string-nya.)

### 2. Setup Backend

```bash
cd rumacart/backend
cp .env.example .env
```

Buka file `.env`, isi `DATABASE_URL` sesuai database kamu (contoh: `postgresql://postgres:passwordkamu@localhost:5432/rumacart`), dan ganti `JWT_SECRET` dengan string acak.

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Kalau berhasil, akan muncul: `RumaCart backend jalan di http://localhost:4000`

Cek dengan membuka `http://localhost:4000/health` di browser — harus muncul `{"status":"ok",...}`.

**Akun demo setelah seeding** (password semua: `password123`):

| Role | Email |
|---|---|
| Super Admin | superadmin@rumacart.com |
| Admin | admin@rumacart.com |
| Kasir | kasir@rumacart.com |
| Gudang | gudang@rumacart.com |
| Kurir | kurir@rumacart.com |
| Customer | customer@rumacart.com |

### 3. Setup Frontend

Buka terminal baru (biarkan backend tetap jalan):

```bash
cd rumacart/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Buka `http://localhost:3000` — landing page RumaCart harus muncul dengan data kategori & produk dari backend.

### 4. Coba alurnya

1. Buka `/register`, daftar akun customer baru (atau login pakai akun demo di atas).
2. Buka `/products`, tambah beberapa barang ke keranjang.
3. Checkout — perhatikan sistem otomatis memilih Fulfillment Point.
4. Login sebagai `gudang@rumacart.com`, buka `/dashboard/gudang`, proses order tadi.
5. Login sebagai `kurir@rumacart.com`, buka `/dashboard/kurir`, ambil & selesaikan pengantaran.
6. Login sebagai `admin@rumacart.com`, buka `/dashboard/admin`, lihat order tadi di overview.

## Kalau Ada Error

- **`Can't reach database server`** → cek PostgreSQL sudah jalan dan `DATABASE_URL` di `.env` benar.
- **`relation "xxx" does not exist`** → belum jalankan `npx prisma migrate dev`.
- **Frontend blank / gagal fetch data** → pastikan backend jalan duluan di port 4000, dan `NEXT_PUBLIC_API_URL` di `.env.local` benar.
- **Error font Poppins saat build** → butuh koneksi internet ke Google Fonts saat build; pastikan online, atau ganti font di `src/app/layout.tsx` kalau perlu offline.

## Fitur yang Sudah Ada (Fase 1)

Auth (register/login JWT, role-based), katalog produk & kategori, cart & checkout dengan pemilihan Fulfillment Point otomatis (berdasarkan jarak/kota + ketersediaan stok), manajemen stok per Point (stock in/out/transfer/adjustment), dashboard Admin/Gudang/Kasir/Kurir/Customer versi dasar, cashflow otomatis dari penjualan + input manual, laporan ringkas di dashboard.

## Roadmap Fase 2 (belum dibangun, menyusul setelah Fase 1 stabil)

Wishlist & review produk, sistem promo/voucher yang lebih lengkap (saat ini voucher baru potongan flat sederhana), Purchase Order & manajemen Supplier, barcode scanning yang terhubung ke hardware scanner, export laporan ke PDF/Excel, notifikasi real-time (order baru, stok menipis, dll — saat ini belum ada websocket/push notification), integrasi payment gateway sungguhan (Midtrans/Xendit dsb — saat ini dummy), integrasi ongkir sungguhan (saat ini flat rate), upload gambar produk ke Cloudinary (saat ini field `images` masih kosong/manual), integrasi Google Maps untuk pilih titik alamat secara visual, audit log & backup otomatis, analytics lanjutan (fast/slow moving, dead stock, dsb).

## Menyiapkan untuk "Production" (Deployment)

Ini bagian yang biasanya dilakukan setelah Fase 1 kamu coba sendiri dan sudah nyaman dengan alurnya. Ringkasnya:

1. **Database**: pakai PostgreSQL terkelola (Neon, Supabase, atau Railway) — tidak perlu install PostgreSQL di server sendiri.
2. **Backend**: deploy ke Railway/Render (mendukung Express secara langsung).
3. **Frontend**: deploy ke Vercel (dibuat oleh tim yang sama dengan Next.js, jadi paling mulus).
4. **Cloudinary**: daftar akun gratis di cloudinary.com untuk upload gambar produk asli.
5. **Environment variables**: pindahkan isi `.env` dan `.env.local` ke dashboard hosting masing-masing (jangan pernah commit file `.env` ke Git).

Kalau kamu sudah sampai di titik ingin deploy, bilang saja — kita lanjutkan tahap itu dengan panduan yang sama detailnya.
