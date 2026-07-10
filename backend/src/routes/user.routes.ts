import { Router } from "express";
import { listUsers, createUser, updateUser } from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Menu User Management cuma bisa diakses Admin Pusat (ADMIN / SUPER_ADMIN).
router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id", updateUser);

export default router;
