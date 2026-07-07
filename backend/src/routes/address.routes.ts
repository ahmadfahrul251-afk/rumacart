import { Router } from "express";
import { listMyAddresses, createAddress, deleteAddress } from "../controllers/address.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, listMyAddresses);
router.post("/", requireAuth, createAddress);
router.delete("/:id", requireAuth, deleteAddress);

export default router;
