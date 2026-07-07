"use client";

import Link from "next/link";
import { useState } from "react";
import { ShoppingCart, Search, Menu, X, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

export function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const [open, setOpen] = useState(false);
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white font-bold">R</span>
          <span className="text-lg font-bold text-primary">RumaCart</span>
        </Link>

        <div className="hidden flex-1 max-w-md items-center gap-2 rounded-xl bg-accent px-4 py-2 md:flex">
          <Search size={18} className="text-ink/40" />
          <input
            placeholder="Cari kebutuhan harianmu..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="/products" className="hover:text-primary">Belanja</Link>
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

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
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
          <nav className="flex flex-col gap-3 text-sm font-medium">
            <Link href="/products" onClick={() => setOpen(false)}>Belanja</Link>
            <Link href="/orders" onClick={() => setOpen(false)}>Pesanan Saya</Link>
            <Link href="/profile" onClick={() => setOpen(false)}>Profil</Link>
            {!user && <Link href="/login" onClick={() => setOpen(false)} className="text-primary">Masuk</Link>}
          </nav>
        </div>
      )}
    </header>
  );
}
