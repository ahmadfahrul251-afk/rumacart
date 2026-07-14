import { Router } from "express";
import { listPoints, createPoint, updatePoint, eligiblePoints, pointsMonitoring } from "../controllers/point.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listPoints);
router.get("/monitoring", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), pointsMonitoring);
router.post("/eligible", requireAuth, eligiblePoints);
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createPoint);
router.put("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), updatePoint);

export default router;
