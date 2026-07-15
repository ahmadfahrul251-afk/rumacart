import { Router } from "express";
import {
  listInventory,
  inventoryStats,
  stockIn,
  stockOut,
  transferStock,
  adjustment,
  claimProduct,
  updatePrice,
  updateThresholds,
  stockReturn,
  stockDamage,
  stockExpired,
  getInventoryHistory,
} from "../controllers/inventory.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const staffRoles = ["ADMIN", "SUPER_ADMIN", "GUDANG"];
// Admin Point boleh lihat & kelola stok punya Point-nya sendiri, tapi transfer
// stok ANTAR Point tetap cuma boleh Admin Pusat/Gudang (lihat Round 3: Transfer Stok).
const pointRoles = [...staffRoles, "ADMIN_POINT"];

router.get("/", requireAuth, requireRole(...pointRoles), listInventory);
router.get("/stats", requireAuth, requireRole(...pointRoles), inventoryStats);
router.post("/stock-in", requireAuth, requireRole(...pointRoles), stockIn);
router.post("/stock-out", requireAuth, requireRole(...pointRoles), stockOut);
router.post("/transfer", requireAuth, requireRole(...staffRoles), transferStock);
router.post("/adjustment", requireAuth, requireRole(...pointRoles), adjustment);
router.post("/claim", requireAuth, requireRole(...pointRoles), claimProduct);
router.patch("/:id/thresholds", requireAuth, requireRole(...pointRoles), updateThresholds);
router.patch("/:id/price", requireAuth, requireRole(...pointRoles), updatePrice);
router.post("/return", requireAuth, requireRole(...pointRoles), stockReturn);
router.post("/damage", requireAuth, requireRole(...pointRoles), stockDamage);
router.post("/expired", requireAuth, requireRole(...pointRoles), stockExpired);
router.get("/:id/history", requireAuth, requireRole(...pointRoles), getInventoryHistory);

export default router;
