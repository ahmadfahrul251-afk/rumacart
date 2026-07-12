import { Router } from "express";
import { createTransfer, listTransfers, getTransfer, receiveTransfer, cancelTransfer } from "../controllers/stockTransfer.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const pusatRoles = ["ADMIN", "SUPER_ADMIN"];
// List/detail/receive: Admin Pusat + Gudang (lintas Point) dan Admin Point (dikunci ke Point-nya sendiri).
const viewRoles = [...pusatRoles, "GUDANG", "ADMIN_POINT"];

router.get("/", requireAuth, requireRole(...viewRoles), listTransfers);
router.get("/:id", requireAuth, requireRole(...viewRoles), getTransfer);
router.post("/", requireAuth, requireRole(...pusatRoles), createTransfer);
router.patch("/:id/receive", requireAuth, requireRole(...viewRoles), receiveTransfer);
router.patch("/:id/cancel", requireAuth, requireRole(...pusatRoles), cancelTransfer);

export default router;
