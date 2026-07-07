import { Router } from "express";
import { listVouchers, validateVoucher, createVoucher } from "../controllers/voucher.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listVouchers);
router.post("/validate", validateVoucher);
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createVoucher);

export default router;
