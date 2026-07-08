"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Package } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold">Profil Saya</h1>
        <div className="card space-y-3">
          <div>
            <p className="text-xs text-ink/50">Nama</p>
            <p className="font-medium">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-ink/50">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-ink/50">No. HP</p>
            <p className="font-medium">{user.phone || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-ink/50">Role</p>
            <p className="font-medium">{user.role}</p>
          </div>
          <button onClick={logout} className="btn-outline mt-4 w-full">Keluar</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/profile/wishlist" className="card flex items-center gap-3 hover:shadow-soft">
            <Heart size={20} className="text-secondary" />
            <span className="text-sm font-medium">Wishlist Saya</span>
          </Link>
          <Link href="/orders" className="card flex items-center gap-3 hover:shadow-soft">
            <Package size={20} className="text-primary" />
            <span className="text-sm font-medium">Riwayat Order</span>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
