import multer from "multer";

// File gambar disimpan sementara di memory (bukan disk) sebagai Buffer,
// lalu langsung diteruskan ke Cloudinary — tidak pernah tersimpan permanen
// di server kita sendiri.
const storage = multer.memoryStorage();

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // maksimal 5MB per file
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File harus berupa gambar (JPG, PNG, WEBP, dll)"));
    }
    cb(null, true);
  },
});
