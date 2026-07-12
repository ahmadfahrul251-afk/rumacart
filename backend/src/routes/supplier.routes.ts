import { Router } from "express";
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
} from "../controllers/supplier.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const staffRoles = ["ADMIN", "SUPER_ADMIN", "GUDANG", "ADMIN_POINT"];

router.get("/", requireAuth, requireRole(...staffRoles), listSuppliers);
router.get("/:id", requireAuth, requireRole(...staffRoles), getSupplier);
router.post("/", requireAuth, requireRole(...staffRoles), createSupplier);
router.patch("/:id", requireAuth, requireRole(...staffRoles), updateSupplier);
router.delete("/:id", requireAuth, requireRole(...staffRoles), deactivateSupplier);

export default router;
