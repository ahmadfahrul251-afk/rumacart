import { Router } from "express";
import { uploadProductImage, uploadAvatarImage } from "../controllers/upload.controller";
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

// Avatar: siapa pun yang login boleh upload foto profilnya sendiri, tidak dibatasi role.
router.post("/avatar", requireAuth, uploadImage.single("image"), uploadAvatarImage);

export default router;
