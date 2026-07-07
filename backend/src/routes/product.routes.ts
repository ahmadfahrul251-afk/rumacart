import { Router } from "express";
import {
  listProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listProducts);
router.get("/:slug", getProductBySlug);
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "GUDANG"), createProduct);
router.put("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "GUDANG"), updateProduct);
router.delete("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), deleteProduct);

export default router;
