import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ok, fail } from "../utils/response";

// GET /api/notifications/my — daftar notifikasi milik user yang login, terbaru dulu.
export async function myNotifications(req: Request, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return ok(res, notifications);
}

// GET /api/notifications/unread-count
export async function unreadCount(req: Request, res: Response) {
  const count = await prisma.notification.count({
    where: { userId: req.user!.userId, isRead: false },
  });
  return ok(res, { count });
}

// PATCH /api/notifications/:id/read
export async function markRead(req: Request, res: Response) {
  const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notif) return fail(res, "Notifikasi tidak ditemukan", 404);
  if (notif.userId !== req.user!.userId) return fail(res, "Kamu tidak punya akses ke notifikasi ini", 403);

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  return ok(res, updated);
}

// PATCH /api/notifications/read-all
export async function markAllRead(req: Request, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  return ok(res, null, "Semua notifikasi ditandai sudah dibaca");
}
