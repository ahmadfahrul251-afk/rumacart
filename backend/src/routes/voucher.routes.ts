import { Router } from "express";
import {
  listVouchers,
  getVoucher,
  validateVoucher,
  createVoucher,
  updateVoucher,
  deactivateVoucher,
} from "../controllers/voucher.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const adminRoles = ["ADMIN", "SUPER_ADMIN"];

router.get("/", listVouchers);
router.post("/validate", validateVoucher);
router.post("/", requireAuth, requireRole(...adminRoles), createVoucher);
router.get("/:id", requireAuth, requireRole(...adminRoles), getVoucher);
router.patch("/:id", requireAuth, requireRole(...adminRoles), updateVoucher);
router.delete("/:id", requireAuth, requireRole(...adminRoles), deactivateVoucher);

export default router;
