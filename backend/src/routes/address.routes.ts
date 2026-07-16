import { Router } from "express";
import { listMyAddresses, createAddress, updateAddress, deleteAddress } from "../controllers/address.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, listMyAddresses);
router.post("/", requireAuth, createAddress);
router.patch("/:id", requireAuth, updateAddress);
router.delete("/:id", requireAuth, deleteAddress);

export default router;
