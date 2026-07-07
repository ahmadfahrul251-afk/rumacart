const ITEMS = [
  { icon: "⚡", title: "Cepat", desc: "Diantar dari Point terdekat, bukan gudang pusat yang jauh." },
  { icon: "🏷️", title: "Harga Bersahabat", desc: "Harga rumah tangga tanpa biaya perantara marketplace." },
  { icon: "📦", title: "Stok Real-time", desc: "Stok tiap Point selalu update, minim kehabisan mendadak." },
  { icon: "🤝", title: "Dipercaya Keluarga", desc: "Satu perusahaan, kualitas dan pelayanan yang konsisten." },
];

export function Advantages() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <h2 className="mb-8 text-center text-xl font-bold">Kenapa Pilih RumaCart</h2>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        {ITEMS.map((it, i) => (
          <div key={i} className="flex flex-col items-center gap-2 text-center">
            <span className="text-3xl">{it.icon}</span>
            <p className="font-semibold">{it.title}</p>
            <p className="text-sm text-ink/60">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
