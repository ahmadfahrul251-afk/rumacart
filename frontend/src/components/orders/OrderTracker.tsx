import { CheckCircle2, Circle, MapPin, Phone, XCircle } from "lucide-react";
import { Order, OrderStatus } from "@/types";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "PENDING", label: "Pesanan Dibuat" },
  { key: "PROCESSED", label: "Diproses" },
  { key: "PREPARED", label: "Disiapkan" },
  { key: "PICKED_UP", label: "Siap Dikirim" },
  { key: "SHIPPED", label: "Dalam Pengiriman" },
  { key: "COMPLETED", label: "Selesai" },
];

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function OrderTracker({ order }: { order: Order }) {
  const history = order.statusHistory || [];
  const currentIndex = STEPS.findIndex((s) => s.key === order.status);

  if (order.status === "CANCELLED") {
    const cancelledAt = history.find((h) => h.status === "CANCELLED")?.createdAt;
    return (
      <div className="card">
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700">
          <XCircle size={22} />
          <div>
            <p className="font-semibold">Pesanan Dibatalkan</p>
            {cancelledAt && <p className="text-xs text-red-600/80">{formatTime(cancelledAt)}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-5">
      <div>
        <p className="mb-4 font-semibold">Status Pesanan</p>
        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const historyEntry = history.find((h) => h.status === step.key);
            const isDone = i < currentIndex || (i === currentIndex && !!historyEntry);
            const isCurrent = i === currentIndex;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {isDone ? (
                    <CheckCircle2 size={20} className={isCurrent ? "text-primary" : "text-primary/70"} />
                  ) : (
                    <Circle size={20} className="text-black/20" />
                  )}
                  {!isLast && <div className={`w-0.5 flex-1 ${isDone ? "bg-primary/40" : "bg-black/10"}`} style={{ minHeight: 28 }} />}
                </div>
                <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                  <p className={`text-sm font-medium ${isDone ? "text-ink" : "text-ink/40"} ${isCurrent ? "text-primary" : ""}`}>
                    {step.label}
                  </p>
                  {historyEntry && <p className="text-xs text-ink/40">{formatTime(historyEntry.createdAt)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {order.point && (
        <div className="border-t border-black/5 pt-4">
          <p className="mb-2 text-xs font-medium text-ink/50">DIKIRIM DARI</p>
          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">{order.point.name}</p>
              <p className="text-ink/60">{order.point.address}, {order.point.city}</p>
            </div>
          </div>
          {order.point.phone && (
            <div className="mt-1.5 flex items-center gap-2 text-sm text-ink/60">
              <Phone size={14} className="shrink-0" />
              {order.point.phone}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
