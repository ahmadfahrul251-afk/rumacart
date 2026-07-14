import { Router } from "express";
import {
  listInventory,
  inventoryStats,
  stockIn,
  stockOut,
  transferStock,
  adjustment,
  claimProduct,
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

export default router;
