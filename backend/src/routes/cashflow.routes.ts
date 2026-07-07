import { Router } from "express";
import { listCashflow, cashflowSummary, createCashflow } from "../controllers/cashflow.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const staffRoles = ["ADMIN", "SUPER_ADMIN"];

router.get("/", requireAuth, requireRole(...staffRoles), listCashflow);
router.get("/summary", requireAuth, requireRole(...staffRoles), cashflowSummary);
router.post("/", requireAuth, requireRole(...staffRoles), createCashflow);

export default router;
