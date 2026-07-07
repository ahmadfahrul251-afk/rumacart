import { Router } from "express";
import { uploadProductImage } from "../controllers/upload.controller";
import { uploadImage } from "../middleware/upload.middleware";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/image",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "GUDANG"),
  uploadImage.single("image"),
  uploadProductImage
);

export default router;
