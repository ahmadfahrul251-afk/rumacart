import { Router } from "express";
import { listReviews, createReview } from "../controllers/review.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", listReviews);
router.post("/", requireAuth, createReview);

export default router;
