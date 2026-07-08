import { Router } from "express";
import {
  listWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
} from "../controllers/wishlist.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, listWishlist);
router.post("/", requireAuth, addToWishlist);
router.delete("/:productId", requireAuth, removeFromWishlist);
router.get("/check/:productId", requireAuth, checkWishlist);

export default router;
