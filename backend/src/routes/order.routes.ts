import { Router } from "express";
import {
  checkout,
  myOrders,
  listOrders,
  getOrder,
  trackOrder,
  updateStatus,
  payOrder,
  verifyPayment,
  listAwaitingVerification,
  courierOrders,
} from "../controllers/order.controller";
import { downloadInvoice, downloadReceipt } from "../controllers/pdf.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const staffRoles = ["ADMIN", "SUPER_ADMIN", "GUDANG", "KASIR", "ADMIN_POINT"];
const financeRoles = ["ADMIN", "SUPER_ADMIN", "KASIR", "ADMIN_POINT"];

router.post("/", requireAuth, checkout);
router.get("/my", requireAuth, myOrders);
router.get("/courier/assigned", requireAuth, requireRole("KURIR"), courierOrders);
router.get("/awaiting-verification", requireAuth, requireRole(...financeRoles), listAwaitingVerification);
router.get("/", requireAuth, requireRole(...staffRoles), listOrders);
router.get("/:id/track", requireAuth, trackOrder);
router.get("/:id/invoice", requireAuth, downloadInvoice);
router.get("/:id/receipt", requireAuth, downloadReceipt);
router.get("/:id", requireAuth, getOrder);
router.patch("/:id/status", requireAuth, requireRole(...staffRoles, "KURIR"), updateStatus);
router.patch("/:id/pay", requireAuth, payOrder);
router.patch("/:id/verify-payment", requireAuth, requireRole(...financeRoles), verifyPayment);

export default router;
