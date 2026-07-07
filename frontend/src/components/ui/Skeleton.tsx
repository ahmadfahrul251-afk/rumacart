import { cn } from "@/lib/utils";

// Loading skeleton sederhana — dipakai selagi data dari API belum datang,
// supaya lebih nyaman dilihat daripada layar kosong / spinner polos.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-black/5", className)} />;
}
