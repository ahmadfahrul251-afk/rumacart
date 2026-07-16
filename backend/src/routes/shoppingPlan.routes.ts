import { Router } from "express";
import { getMyPlan, updatePlan, addItem, updateItem, removeItem } from "../controllers/shoppingPlan.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyPlan);
router.patch("/:id", updatePlan);
router.post("/:id/items", addItem);
router.patch("/:id/items/:itemId", updateItem);
router.delete("/:id/items/:itemId", removeItem);

export default router;
