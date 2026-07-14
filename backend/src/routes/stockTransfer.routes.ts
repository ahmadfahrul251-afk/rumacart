import { Router } from "express";
import { createTransfer, listTransfers, getTransfer, receiveTransfer, cancelTransfer } from "../controllers/stockTransfer.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
const pusatRoles = ["ADMIN", "SUPER_ADMIN"];
// List/detail/receive: Admin Pusat + Gudang (lintas lokasi) dan Admin Lokasi (dikunci ke lokasinya sendiri).
const viewRoles = [...pusatRoles, "GUDANG", "ADMIN_POINT"];
// Create/cancel: Admin Pusat bebas pilih lokasi asal, Admin Lokasi cuma bisa kirim
// keluar dari lokasinya sendiri (dipaksa di controller lewat resolveWritePointId).
const createRoles = [...pusatRoles, "ADMIN_POINT"];

router.get("/", requireAuth, requireRole(...viewRoles), listTransfers);
router.get("/:id", requireAuth, requireRole(...viewRoles), getTransfer);
router.post("/", requireAuth, requireRole(...createRoles), createTransfer);
router.patch("/:id/receive", requireAuth, requireRole(...viewRoles), receiveTransfer);
router.patch("/:id/cancel", requireAuth, requireRole(...createRoles), cancelTransfer);

export default router;
