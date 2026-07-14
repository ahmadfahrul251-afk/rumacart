import { Router } from "express";
import { listPoints, getPoint, createPoint, updatePoint, eligiblePoints, pointsMonitoring } from "../controllers/point.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listPoints);
router.get("/monitoring", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), pointsMonitoring);
router.post("/eligible", requireAuth, eligiblePoints);
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createPoint);
router.get("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), getPoint);
router.put("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), updatePoint);

export default router;
