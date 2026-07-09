import { Router } from "express";
import {
  checkout,
  myOrders,
  listOrders,
  getOrder,
  updateStatus,
  payOrder,
  verifyPayment,
  listAwaitingVerification,
  courierOrders,
} from "../controllers/order.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const staffRoles = ["ADMIN", "SUPER_ADMIN", "GUDANG", "KASIR"];
const financeRoles = ["ADMIN", "SUPER_ADMIN", "KASIR"];

router.post("/", requireAuth, checkout);
router.get("/my", requireAuth, myOrders);
router.get("/courier/assigned", requireAuth, requireRole("KURIR"), courierOrders);
router.get("/awaiting-verification", requireAuth, requireRole(...financeRoles), listAwaitingVerification);
router.get("/", requireAuth, requireRole(...staffRoles), listOrders);
router.get("/:id", requireAuth, getOrder);
router.patch("/:id/status", requireAuth, requireRole(...staffRoles, "KURIR"), updateStatus);
router.patch("/:id/pay", requireAuth, payOrder);
router.patch("/:id/verify-payment", requireAuth, requireRole(...financeRoles), verifyPayment);

export default router;
