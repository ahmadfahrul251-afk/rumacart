import { v2 as cloudinary } from "cloudinary";

// Konfigurasi Cloudinary dari environment variable.
// Kalau salah satu kosong, upload akan gagal dengan pesan error yang jelas
// (bukan crash diam-diam) — lihat upload.controller.ts.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
