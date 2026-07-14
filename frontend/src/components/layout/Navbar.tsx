"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Search, Menu, X, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { getDashboardPath } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";

export function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);
  const isStaff = !!user && user.role !== "CUSTOMER";
  const dashboardPath = getDashboardPath(user?.role);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();
    router.push(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : "/products");
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RumaCart" className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-bold text-primary">RumaCart</span>
        </Link>

        <form
          onSubmit={handleSearchSubmit}
          className="hidden flex-1 max-w-md items-center gap-2 rounded-xl bg-accent px-4 py-2 md:flex"
        >
          <button type="submit" aria-label="Cari" className="shrink-0">
            <Search size={18} className="text-ink/40" />
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kebutuhan harianmu..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </form>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/products" className="hover:text-primary">Belanja</Link>
          <Link href="/points" className="hover:text-primary">Point Terdekat</Link>
          <Link href="/orders" className="hover:text-primary">Pesanan Saya</Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/cart" className="relative rounded-xl p-2.5 hover:bg-accent">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-secondary text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {user && <NotificationBell />}

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {isStaff && (
                <Link href={dashboardPath} className="rounded-xl px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                  Dashboard
                </Link>
              )}
              <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-accent">
                <UserIcon size={18} />
                <span className="text-sm font-medium">{user.name.split(" ")[0]}</span>
              </Link>
              <button onClick={logout} className="text-sm text-ink/60 hover:text-ink">Keluar</button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary hidden md:inline-flex !py-2 !px-4 text-sm">
              Masuk
            </Link>
          )}

          <button className="rounded-xl p-2.5 hover:bg-accent md:hidden" onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-black/5 bg-white px-4 py-3 md:hidden">
          <form onSubmit={handleSearchSubmit} className="mb-3 flex items-center gap-2 rounded-xl bg-accent px-4 py-2">
            <button type="submit" aria-label="Cari" className="shrink-0">
              <Search size={18} className="text-ink/40" />
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kebutuhan harianmu..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
            />
          </form>
          <nav className="flex flex-col gap-3 text-sm font-medium">
            <Link href="/products" onClick={() => setOpen(false)}>Belanja</Link>
            <Link href="/points" onClick={() => setOpen(false)}>Point Terdekat</Link>
            <Link href="/orders" onClick={() => setOpen(false)}>Pesanan Saya</Link>
            <Link href="/profile" onClick={() => setOpen(false)}>Profil</Link>
            {isStaff && (
              <Link href={dashboardPath} onClick={() => setOpen(false)} className="text-primary">Dashboard</Link>
            )}
            {!user && <Link href="/login" onClick={() => setOpen(false)} className="text-primary">Masuk</Link>}
          </nav>
        </div>
      )}
    </header>
  );
}
