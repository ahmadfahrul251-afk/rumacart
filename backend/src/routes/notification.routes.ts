import { Router } from "express";
import { myNotifications, unreadCount, markRead, markAllRead } from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth); // semua endpoint notifikasi wajib login

router.get("/my", myNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

export default router;
