import { Router } from "express";
import { createPo, listPo, getPo, receivePo, cancelPo } from "../controllers/purchaseOrder.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const staffRoles = ["ADMIN", "SUPER_ADMIN", "GUDANG", "ADMIN_POINT"];

router.get("/", requireAuth, requireRole(...staffRoles), listPo);
router.get("/:id", requireAuth, requireRole(...staffRoles), getPo);
router.post("/", requireAuth, requireRole(...staffRoles), createPo);
router.patch("/:id/receive", requireAuth, requireRole(...staffRoles), receivePo);
router.patch("/:id/cancel", requireAuth, requireRole(...staffRoles), cancelPo);

export default router;
