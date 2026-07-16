import { Router } from "express";
import { listProvinces, listRegencies, listDistricts } from "../controllers/region.controller";

const router = Router();

// Publik (tanpa requireAuth) — dipakai form alamat di halaman checkout yang
// bisa diakses sebelum login juga.
router.get("/provinces", listProvinces);
router.get("/regencies", listRegencies);
router.get("/districts", listDistricts);

export default router;
