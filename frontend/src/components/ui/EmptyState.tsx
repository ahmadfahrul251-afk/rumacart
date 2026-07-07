import { ReactNode } from "react";

// Dipakai saat data kosong (cart kosong, order kosong, dll) supaya
// UI tidak terasa "blank"/error, sesuai guideline UX di brief.
export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white/60 py-16 text-center">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink/60">{description}</p>}
    </div>
  );
}
