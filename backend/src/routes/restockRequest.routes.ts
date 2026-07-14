import { Router } from "express";
import {
  listRestockRequests,
  createRestockRequest,
  approveRestockRequestCtrl,
  rejectRestockRequestCtrl,
  fulfillRestockRequestCtrl,
} from "../controllers/restockRequest.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const roles = ["ADMIN", "SUPER_ADMIN", "ADMIN_POINT"];

router.get("/", requireAuth, requireRole(...roles), listRestockRequests);
router.post("/", requireAuth, requireRole(...roles), createRestockRequest);
router.patch("/:id/approve", requireAuth, requireRole(...roles), approveRestockRequestCtrl);
router.patch("/:id/reject", requireAuth, requireRole(...roles), rejectRestockRequestCtrl);
router.patch("/:id/fulfill", requireAuth, requireRole(...roles), fulfillRestockRequestCtrl);

export default router;
