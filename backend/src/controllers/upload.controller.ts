import { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary";
import { ok, fail } from "../utils/response";

// Helper bersama: upload buffer file ke folder Cloudinary tertentu, kembalikan URL publiknya.
async function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, uploadResult) => {
      if (error || !uploadResult) return reject(error);
      resolve(uploadResult as { secure_url: string });
    });
    stream.end(buffer);
  });
  return result.secure_url;
}

// POST /api/upload/image — terima 1 file gambar (field name: "image"),
// upload ke Cloudinary, kembalikan URL publiknya untuk disimpan di
// Product.images. Dipakai dari halaman Admin > Produk saat upload foto.
export async function uploadProductImage(req: Request, res: Response) {
  if (!req.file) {
    return fail(res, "Tidak ada file yang diupload", 422);
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    return fail(
      res,
      "Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di file .env backend.",
      500
    );
  }

  try {
    const url = await uploadToCloudinary(req.file.buffer, "rumacart/products");
    return ok(res, { url }, "Gambar berhasil diupload");
  } catch (err: any) {
    return fail(res, err.message || "Gagal upload gambar ke Cloudinary", 500);
  }
}

// POST /api/upload/avatar — sama seperti di atas tapi untuk foto profil.
// Dibedakan foldernya (rumacart/avatars) dan sengaja tidak dibatasi role tertentu
// di route-nya — siapa pun yang login (termasuk Customer) boleh ganti avatarnya sendiri.
export async function uploadAvatarImage(req: Request, res: Response) {
  if (!req.file) {
    return fail(res, "Tidak ada file yang diupload", 422);
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    return fail(
      res,
      "Cloudinary belum dikonfigurasi. Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di file .env backend.",
      500
    );
  }

  try {
    const url = await uploadToCloudinary(req.file.buffer, "rumacart/avatars");
    return ok(res, { url }, "Foto profil berhasil diupload");
  } catch (err: any) {
    return fail(res, err.message || "Gagal upload gambar ke Cloudinary", 500);
  }
}
