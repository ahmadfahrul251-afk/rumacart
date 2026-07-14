import { Router } from "express";
import {
  listProducts,
  getProductBySlug,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listProducts);
router.get("/barcode/:code", getProductByBarcode);
router.get("/:slug", getProductBySlug);
// Input produk baru sengaja dipusatkan ke Admin Pusat (ADMIN/SUPER_ADMIN) — Point
// tinggal "klaim" produk yang sudah ada lewat POST /api/inventory/claim.
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createProduct);
router.put("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "GUDANG"), updateProduct);
router.delete("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), deleteProduct);

export default router;
