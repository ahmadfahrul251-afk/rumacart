import { Router } from "express";
import {
  listInventory,
  inventoryStats,
  stockIn,
  stockOut,
  transferStock,
  adjustment,
} from "../controllers/inventory.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const staffRoles = ["ADMIN", "SUPER_ADMIN", "GUDANG"];

router.get("/", requireAuth, requireRole(...staffRoles), listInventory);
router.get("/stats", requireAuth, requireRole(...staffRoles), inventoryStats);
router.post("/stock-in", requireAuth, requireRole(...staffRoles), stockIn);
router.post("/stock-out", requireAuth, requireRole(...staffRoles), stockOut);
router.post("/transfer", requireAuth, requireRole(...staffRoles), transferStock);
router.post("/adjustment", requireAuth, requireRole(...staffRoles), adjustment);

export default router;
