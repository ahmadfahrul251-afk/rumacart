import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { PlannedCartProvider } from "@/lib/planned-cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "RumaCart - Belanja Kebutuhan Harian Tanpa Harus Keluar Rumah",
  description:
    "RumaCart adalah platform belanja kebutuhan rumah tangga dengan pengantaran dari Point RumaCart terdekat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${poppins.variable} font-sans`}>
        <AuthProvider>
          <CartProvider>
            <PlannedCartProvider>
              <WishlistProvider>{children}</WishlistProvider>
            </PlannedCartProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
