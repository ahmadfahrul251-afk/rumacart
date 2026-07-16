"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Package, MapPin, Pencil } from "lucide-react";
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
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-xl">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-ink/50">{user.email}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-ink/50">No. HP</p>
            <p className="font-medium">{user.phone || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-ink/50">Role</p>
            <p className="font-medium">{user.role}</p>
          </div>
          <Link href="/profile/edit" className="btn-outline mt-2 flex w-full items-center justify-center gap-2">
            <Pencil size={16} /> Edit Profil
          </Link>
          <button onClick={logout} className="btn-outline w-full">Keluar</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/profile/addresses" className="card flex items-center gap-3 hover:shadow-soft">
            <MapPin size={20} className="text-primary" />
            <span className="text-sm font-medium">Alamat Saya</span>
          </Link>
          <Link href="/profile/wishlist" className="card flex items-center gap-3 hover:shadow-soft">
            <Heart size={20} className="text-secondary" />
            <span className="text-sm font-medium">Wishlist Saya</span>
          </Link>
          <Link href="/orders" className="card col-span-2 flex items-center gap-3 hover:shadow-soft">
            <Package size={20} className="text-primary" />
            <span className="text-sm font-medium">Riwayat Order</span>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
