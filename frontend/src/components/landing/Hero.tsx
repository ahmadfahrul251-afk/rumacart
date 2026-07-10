import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-primary-light to-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Link href="/products" className="block overflow-hidden rounded-[2rem] shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/poster-hero.png"
            alt="RumaCart - Belanja Harian, Tanpa Harus Keluar Rumah"
            className="w-full h-auto"
          />
        </Link>
        <div className="mt-4 text-center">
          <Link href="/promo" className="text-sm font-medium text-primary hover:underline">
            Lihat Promo →
          </Link>
        </div>
      </div>
    </section>
  );
}
