import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Komponen tampilan bintang (read-only) — dipakai untuk menampilkan rating
// rata-rata produk. Untuk input rating dari user, lihat ReviewSection.
export function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={cn(n <= Math.round(value) ? "fill-secondary text-secondary" : "text-black/15")}
        />
      ))}
    </div>
  );
}
