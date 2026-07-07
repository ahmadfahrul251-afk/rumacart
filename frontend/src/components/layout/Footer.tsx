import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white font-bold">R</span>
            <span className="text-lg font-bold text-primary">RumaCart</span>
          </div>
          <p className="text-sm text-ink/60">
            Belanja kebutuhan harian keluarga tanpa harus keluar rumah.
          </p>
        </div>

        <div>
          <p className="mb-3 font-semibold">Belanja</p>
          <ul className="space-y-2 text-sm text-ink/60">
            <li><Link href="/products">Semua Produk</Link></li>
            <li><Link href="/products">Promo</Link></li>
            <li><Link href="/products">Kategori</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 font-semibold">Bantuan</p>
          <ul className="space-y-2 text-sm text-ink/60">
            <li><Link href="/orders">Lacak Pesanan</Link></li>
            <li><Link href="/">Cara Kerja</Link></li>
            <li><Link href="/">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 font-semibold">Perusahaan</p>
          <ul className="space-y-2 text-sm text-ink/60">
            <li>Tentang RumaCart</li>
            <li>Karir</li>
            <li>Hubungi Kami</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/5 py-4 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} RumaCart. Semua hak cipta dilindungi.
      </div>
    </footer>
  );
}
