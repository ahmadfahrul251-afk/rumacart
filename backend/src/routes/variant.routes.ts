import { Router } from "express";
import { updateVariant, deleteVariant, getVariantByBarcode } from "../controllers/variant.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Dipakai POS Kasir saat scan barcode — taruh sebelum /:id biar "barcode"
// tidak ketangkep sebagai :id.
router.get("/barcode/:code", getVariantByBarcode);
router.put("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), updateVariant);
router.delete("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), deleteVariant);

export default router;
