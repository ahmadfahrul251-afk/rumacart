"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Review } from "@/types";
import { cn } from "@/lib/utils";

interface ReviewResponse {
  reviews: Review[];
  avgRating: number;
  totalReviews: number;
}

export function ReviewSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function load() {
    api
      .get<ReviewResponse>(`/reviews?productId=${productId}`)
      .then(setData)
      .catch(() => setData({ reviews: [], avgRating: 0, totalReviews: 0 }));
  }

  useEffect(load, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.post("/reviews", { productId, rating, comment });
      setSuccess("Terima kasih atas review-mu!");
      setComment("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-12 border-t border-black/5 pt-8">
      <div className="mb-6 flex items-center gap-4">
        <h2 className="text-xl font-bold">Review Produk</h2>
        {data && data.totalReviews > 0 && (
          <div className="flex items-center gap-2 text-sm text-ink/60">
            <StarRating value={data.avgRating} />
            <span>{data.avgRating} ({data.totalReviews} review)</span>
          </div>
        )}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
          <p className="text-sm font-medium">Kasih review produk ini</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)}>
                <Star
                  size={22}
                  className={cn(n <= rating ? "fill-secondary text-secondary" : "text-black/15")}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ceritakan pengalamanmu dengan produk ini (opsional)"
            rows={3}
            className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-primary">{success}</p>}
          <Button type="submit" disabled={submitting} className="!py-2 !px-4 text-sm">
            {submitting ? "Mengirim..." : "Kirim Review"}
          </Button>
          <p className="text-xs text-ink/40">
            Hanya bisa review produk yang statusnya sudah "Selesai" di riwayat pesananmu.
          </p>
        </form>
      )}

      {data?.reviews.length === 0 && (
        <EmptyState icon="⭐" title="Belum ada review" description="Jadilah yang pertama memberi review produk ini." />
      )}

      <div className="space-y-4">
        {data?.reviews.map((r) => (
          <div key={r.id} className="border-b border-black/5 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{r.user.name}</p>
              <span className="text-xs text-ink/40">
                {new Date(r.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
              </span>
            </div>
            <StarRating value={r.rating} size={12} />
            {r.comment && <p className="mt-1 text-sm text-ink/70">{r.comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
