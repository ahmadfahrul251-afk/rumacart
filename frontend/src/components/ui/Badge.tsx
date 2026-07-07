import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSED: "bg-blue-100 text-blue-700",
  PREPARED: "bg-blue-100 text-blue-700",
  PICKED_UP: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        tone ? STATUS_COLOR[tone] || "bg-accent text-ink" : "bg-accent text-ink"
      )}
    >
      {children}
    </span>
  );
}
