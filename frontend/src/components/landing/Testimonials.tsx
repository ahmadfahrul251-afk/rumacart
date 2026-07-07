const TESTIMONIALS = [
  { name: "Ibu Rina", role: "Ibu Rumah Tangga", text: "Belanja bulanan jadi gampang, tinggal pesan dari HP, sampai rumah cepat." },
  { name: "Dimas", role: "Anak Kost", text: "Praktis banget buat anak kost kayak aku, gak perlu ke minimarket tiap hari." },
  { name: "Keluarga Andika", role: "Keluarga Muda", text: "Harganya masuk akal dan stoknya lengkap, jadi langganan tiap minggu." },
];

export function Testimonials() {
  return (
    <section className="bg-accent py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="mb-8 text-center text-xl font-bold">Apa Kata Mereka</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="card">
              <p className="text-sm text-ink/70">"{t.text}"</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-light font-semibold text-primary">
                  {t.name[0]}
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-ink/50">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
