import { Router } from "express";
import {
  listDeliveryAreas,
  createDeliveryArea,
  updateDeliveryArea,
  deleteDeliveryArea,
  quoteDeliveryAreas,
} from "../controllers/deliveryArea.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const manageRoles = ["ADMIN", "SUPER_ADMIN", "ADMIN_POINT"];

router.get("/", requireAuth, requireRole(...manageRoles), listDeliveryAreas);
router.post("/", requireAuth, requireRole(...manageRoles), createDeliveryArea);
router.patch("/:id", requireAuth, requireRole(...manageRoles), updateDeliveryArea);
router.delete("/:id", requireAuth, requireRole(...manageRoles), deleteDeliveryArea);
// Dipakai checkout customer (bukan cuma Admin/Admin Lokasi) — cukup login.
router.post("/quote", requireAuth, quoteDeliveryAreas);

export default router;
