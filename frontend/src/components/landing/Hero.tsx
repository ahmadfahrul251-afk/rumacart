import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-primary-light to-background">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
        <div>
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            Belanja tanpa antre, tanpa ribet
          </span>
          <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl md:text-5xl">
            Belanja Kebutuhan Harian{" "}
            <span className="text-primary">Tanpa Harus Keluar Rumah</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-ink/60">
            Belanja lebih mudah, lebih hemat waktu, dan diantar dari Point RumaCart terdekat dari rumahmu.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary">Belanja Sekarang</Link>
            <Link href="/promo" className="btn-outline">Lihat Promo</Link>
          </div>
        </div>
        <div className="relative">
          <div className="mx-auto grid aspect-square max-w-sm place-items-center rounded-[2rem] bg-primary text-8xl shadow-soft">
            🛍️
          </div>
        </div>
      </div>
    </section>
  );
}
