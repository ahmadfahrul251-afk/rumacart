import cron from "node-cron";
import { prisma } from "../config/db";
import { createNotification } from "./notification.service";

// Cek 2 tanggal per rencana aktif: tanggal "pengingat" (H-offset) dan tanggal
// "checkout" itu sendiri (hari-H). Dihitung pakai Date asli (bukan aritmetika
// angka tanggal manual) supaya otomatis aman kalau reminder-nya jatuh di
// bulan sebelumnya (misal checkoutDay=3, offset=7 -> otomatis jadi tanggal 27
// bulan lalu, JS Date yang urus, tidak perlu hitung manual jumlah hari per bulan).
function thisMonthDate(day: number, ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), day);
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function alreadyHandledToday(lastAt: Date | null, today: Date): boolean {
  return !!lastAt && isSameLocalDate(lastAt, today);
}

// Diekspor terpisah dari `cron.schedule` supaya bisa dipanggil langsung
// (mis. buat testing manual) tanpa harus nunggu jadwal cron beneran jalan.
export async function runShoppingPlanReminders(now: Date = new Date()) {
  const plans = await prisma.shoppingPlan.findMany({
    where: { isActive: true },
    include: { items: true },
  });

  for (const plan of plans) {
    if (plan.items.length === 0) continue; // rencana kosong, tidak perlu diingatkan

    const checkoutDate = thisMonthDate(plan.checkoutDay, now);
    const reminderDate = new Date(checkoutDate);
    reminderDate.setDate(reminderDate.getDate() - plan.reminderOffsetDays);

    if (
      plan.reminderOffsetDays > 0 &&
      isSameLocalDate(now, reminderDate) &&
      !alreadyHandledToday(plan.lastReminderSentAt, now)
    ) {
      await createNotification({
        userId: plan.userId,
        type: "REMINDER",
        title: "Waktunya Menyiapkan Belanja Bulanan",
        message: `${plan.reminderOffsetDays} hari lagi (tanggal ${plan.checkoutDay}) saatnya checkout belanja bulanan kamu. Yuk cek daftarnya dulu, siapa tahu ada yang mau ditambah atau dikurangi.`,
        refId: plan.id,
      });
      await prisma.shoppingPlan.update({ where: { id: plan.id }, data: { lastReminderSentAt: now } });
    }

    if (isSameLocalDate(now, checkoutDate) && !alreadyHandledToday(plan.lastCheckoutPromptAt, now)) {
      await createNotification({
        userId: plan.userId,
        type: "REMINDER",
        title: "Saatnya Checkout Belanja Bulanan!",
        message: "Hari ini jadwal checkout belanja bulanan kamu. Tekan di sini untuk pindahkan daftarnya ke keranjang.",
        refId: plan.id,
      });
      await prisma.shoppingPlan.update({ where: { id: plan.id }, data: { lastCheckoutPromptAt: now } });
    }
  }
}

// Dipanggil sekali saat server start (lihat server.ts). Jadwal jam 01:00 UTC
// (~08:00 WIB) — waktu pagi yang wajar buat notifikasi rumah tangga.
// Catatan: sesuaikan jam cron di sini kalau server Railway-nya ada di
// timezone/region lain.
export function startShoppingPlanScheduler() {
  cron.schedule("0 1 * * *", () => {
    runShoppingPlanReminders().catch((err) => {
      console.error("Gagal jalankan pengingat Belanja Bulanan:", err);
    });
  });
}
