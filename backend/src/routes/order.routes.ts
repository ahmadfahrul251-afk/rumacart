import { Router } from "express";
import {
  checkout,
  myOrders,
  listOrders,
  getOrder,
  updateStatus,
  courierOrders,
} from "../controllers/order.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const staffRoles = ["ADMIN", "SUPER_ADMIN", "GUDANG", "KASIR"];

router.post("/", requireAuth, checkout);
router.get("/my", requireAuth, myOrders);
router.get("/courier/assigned", requireAuth, requireRole("KURIR"), courierOrders);
router.get("/", requireAuth, requireRole(...staffRoles), listOrders);
router.get("/:id", requireAuth, getOrder);
router.patch("/:id/status", requireAuth, requireRole(...staffRoles, "KURIR"), updateStatus);

export default router;
