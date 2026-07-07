import { Router } from "express";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listCategories); // publik, dipakai landing page & katalog
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createCategory);
router.put("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), updateCategory);
router.delete("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), deleteCategory);

export default router;
