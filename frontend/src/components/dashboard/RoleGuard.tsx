"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Membungkus halaman dashboard supaya hanya role yang sesuai bisa mengakses.
// Kalau belum login → redirect ke /login. Kalau role tidak cocok → redirect ke /.
export function RoleGuard({ allow, children }: { allow: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
    else if (!allow.includes(user.role)) router.push("/");
  }, [user, loading, allow, router]);

  if (loading || !user || !allow.includes(user.role)) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-ink/50">Memuat...</div>;
  }
  return <>{children}</>;
}
