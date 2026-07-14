import { Router } from "express";
import {
  listPoints,
  getPoint,
  createPoint,
  updatePoint,
  eligiblePoints,
  pointsMonitoring,
  listCustomerPoints,
  getPointPublic,
  getPointProducts,
} from "../controllers/point.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listPoints);
// PENTING: /nearby harus didaftarkan SEBELUM /:id, kalau tidak Express bakal
// nganggap "nearby" sebagai value :id (route /:id kebetulan sama-sama 1 segmen).
router.get("/nearby", listCustomerPoints);
router.get("/monitoring", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), pointsMonitoring);
router.post("/eligible", requireAuth, eligiblePoints);
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createPoint);
router.get("/:id/public", getPointPublic);
router.get("/:id/products", getPointProducts);
router.get("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), getPoint);
router.put("/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), updatePoint);

export default router;
