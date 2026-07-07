const STEPS = [
  { icon: "🔍", title: "Pilih Produk", desc: "Cari & pilih kebutuhan harianmu di katalog RumaCart." },
  { icon: "📍", title: "Sistem Pilih Point Terdekat", desc: "Kami otomatis carikan Point RumaCart terdekat yang stoknya tersedia." },
  { icon: "💳", title: "Bayar dengan Mudah", desc: "COD, transfer, atau e-wallet — sesuai kenyamananmu." },
  { icon: "🚚", title: "Barang Diantar", desc: "Pesanan disiapkan lalu diantar kurir RumaCart ke rumahmu." },
];

export function HowItWorks() {
  return (
    <section className="bg-accent py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="mb-8 text-center text-xl font-bold">Cara Kerja RumaCart</h2>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={i} className="card flex flex-col items-center gap-3 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-light text-2xl">
                {s.icon}
              </span>
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-ink/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
