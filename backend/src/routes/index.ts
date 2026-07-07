import { Router } from "express";
import authRoutes from "./auth.routes";
import categoryRoutes from "./category.routes";
import productRoutes from "./product.routes";
import pointRoutes from "./point.routes";
import inventoryRoutes from "./inventory.routes";
import orderRoutes from "./order.routes";
import cashflowRoutes from "./cashflow.routes";
import voucherRoutes from "./voucher.routes";
import addressRoutes from "./address.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/points", pointRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/orders", orderRoutes);
router.use("/cashflow", cashflowRoutes);
router.use("/vouchers", voucherRoutes);
router.use("/addresses", addressRoutes);

export default router;
