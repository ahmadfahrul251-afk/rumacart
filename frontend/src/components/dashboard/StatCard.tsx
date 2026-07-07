import { ReactNode } from "react";

export function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/60">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
