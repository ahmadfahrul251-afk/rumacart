import { Router } from "express";
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { listVariants, createVariant } from "../controllers/variant.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listProducts);
// SKU/barcode/dimensi/harga sekarang di level ProductVariant (Round 18) —
// lookup barcode dipindah ke GET /api/variants/barcode/:code.
router.get("/:productId/variants", listVariants);
// Varian PERTAMA sebuah produk dibuat sekalian lewat POST / di bawah ini.
// Endpoint ini dipakai buat nambah varian LAIN (rasa/ukuran lain) belakangan.
router.post("/:productId/variants", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createVariant);
router.get("/:slug", getProductBySlug);
// Input produk baru sengaja dipusatkan ke Admin Pusat (ADMIN/SUPER_ADMIN) — Point
// tinggal "klaim" produk yang sudah ada lewat POST /api/inventory/claim.
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createProduct);
router.put("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "GUDANG"), updateProduct);
router.delete("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), deleteProduct);

export default router;
