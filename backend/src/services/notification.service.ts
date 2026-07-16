import { prisma } from "../config/db";

type NotificationType = "ORDER" | "PROMO" | "SYSTEM" | "REMINDER";

interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  refId?: string;
}

// Kirim 1 notifikasi ke 1 user. Dipakai untuk hal-hal yang sifatnya
// spesifik ke user tertentu, misalnya perubahan status pesanan.
export async function createNotification(input: NotifyInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type || "SYSTEM",
      refId: input.refId,
    },
  });
}

interface BroadcastInput {
  title: string;
  message: string;
  type?: NotificationType;
  refId?: string;
}

// Kirim notifikasi yang sama ke SEMUA customer aktif, misalnya saat ada voucher/promo baru.
export async function notifyAllCustomers(input: BroadcastInput) {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER", isActive: true },
    select: { id: true },
  });
  if (customers.length === 0) return;

  await prisma.notification.createMany({
    data: customers.map((c: { id: string }) => ({
      userId: c.id,
      title: input.title,
      message: input.message,
      type: input.type || "PROMO",
      refId: input.refId,
    })),
  });
}
