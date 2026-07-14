"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Boxes, Truck, ShoppingBag, Wallet, LogOut, Factory, ClipboardList, BadgeCheck, Ticket, Users, ArrowRightLeft, Store, PackagePlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const LINKS: Record<string, { href: string; label: string; icon: any }[]> = {
  ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/products", label: "Produk", icon: Boxes },
    { href: "/dashboard/admin", label: "Order", icon: ShoppingBag },
    { href: "/dashboard/admin", label: "Inventory", icon: Package },
    { href: "/dashboard/admin/points", label: "Lokasi & Jaringan", icon: Store },
    { href: "/dashboard/admin/stock-transfers", label: "Transfer Stok", icon: ArrowRightLeft },
    { href: "/dashboard/admin/restock-requests", label: "Restock Request", icon: PackagePlus },
    { href: "/dashboard/admin/delivery-areas", label: "Area Pengiriman", icon: Truck },
    { href: "/dashboard/admin/suppliers", label: "Supplier", icon: Factory },
    { href: "/dashboard/admin/purchase-orders", label: "Purchase Order", icon: ClipboardList },
    { href: "/dashboard/admin/payment-verification", label: "Verifikasi Bayar", icon: BadgeCheck },
    { href: "/dashboard/admin/vouchers", label: "Voucher & Promo", icon: Ticket },
    { href: "/dashboard/admin/cashflow", label: "Cashflow", icon: Wallet },
    { href: "/dashboard/admin/users", label: "Kelola Akun", icon: Users },
  ],
  SUPER_ADMIN: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/products", label: "Produk", icon: Boxes },
    { href: "/dashboard/admin", label: "Order", icon: ShoppingBag },
    { href: "/dashboard/admin", label: "Inventory", icon: Package },
    { href: "/dashboard/admin/points", label: "Lokasi & Jaringan", icon: Store },
    { href: "/dashboard/admin/stock-transfers", label: "Transfer Stok", icon: ArrowRightLeft },
    { href: "/dashboard/admin/restock-requests", label: "Restock Request", icon: PackagePlus },
    { href: "/dashboard/admin/delivery-areas", label: "Area Pengiriman", icon: Truck },
    { href: "/dashboard/admin/suppliers", label: "Supplier", icon: Factory },
    { href: "/dashboard/admin/purchase-orders", label: "Purchase Order", icon: ClipboardList },
    { href: "/dashboard/admin/payment-verification", label: "Verifikasi Bayar", icon: BadgeCheck },
    { href: "/dashboard/admin/vouchers", label: "Voucher & Promo", icon: Ticket },
    { href: "/dashboard/admin/cashflow", label: "Cashflow", icon: Wallet },
    { href: "/dashboard/admin/users", label: "Kelola Akun", icon: Users },
  ],
  // Admin Point: kelola 1 Point saja. Kelola Akun tetap khusus Admin Pusat.
  ADMIN_POINT: [
    { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/admin/products", label: "Produk", icon: Boxes },
    { href: "/dashboard/admin", label: "Order", icon: ShoppingBag },
    { href: "/dashboard/admin", label: "Inventory", icon: Package },
    { href: "/dashboard/admin/stock-transfers", label: "Transfer Stok", icon: ArrowRightLeft },
    { href: "/dashboard/admin/restock-requests", label: "Restock Request", icon: PackagePlus },
    { href: "/dashboard/admin/delivery-areas", label: "Area Pengiriman", icon: Truck },
    { href: "/dashboard/admin/suppliers", label: "Supplier", icon: Factory },
    { href: "/dashboard/admin/purchase-orders", label: "Purchase Order", icon: ClipboardList },
    { href: "/dashboard/admin/payment-verification", label: "Verifikasi Bayar", icon: BadgeCheck },
    { href: "/dashboard/admin/cashflow", label: "Cashflow", icon: Wallet },
  ],
  GUDANG: [
    { href: "/dashboard/gudang", label: "Order Masuk", icon: ShoppingBag },
    { href: "/dashboard/gudang", label: "Inventory", icon: Package },
    { href: "/dashboard/admin/products", label: "Produk", icon: Boxes },
    { href: "/dashboard/admin/stock-transfers", label: "Transfer Stok", icon: ArrowRightLeft },
    { href: "/dashboard/admin/suppliers", label: "Supplier", icon: Factory },
    { href: "/dashboard/admin/purchase-orders", label: "Purchase Order", icon: ClipboardList },
  ],
  KASIR: [
    { href: "/dashboard/kasir", label: "POS", icon: ShoppingBag },
    { href: "/dashboard/admin/payment-verification", label: "Verifikasi Bayar", icon: BadgeCheck },
  ],
  KURIR: [{ href: "/dashboard/kurir", label: "Pengantaran", icon: Truck }],
};

export function DashboardSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const links = LINKS[role] || [];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-black/5 bg-white p-4 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="RumaCart" className="h-9 w-9 rounded-xl" />
        <span className="font-bold text-primary">RumaCart</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {links.map((link, i) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={i}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-primary-light text-primary" : "text-ink/70 hover:bg-accent"
              }`}
            >
              <Icon size={18} /> {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-black/5 pt-4">
        <p className="mb-2 text-xs text-ink/50">{user?.name} · {role}</p>
        <button onClick={logout} className="flex items-center gap-2 text-sm text-ink/60 hover:text-red-600">
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </aside>
  );
}
