"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ = [
  { q: "Apa itu RumaCart?", a: "RumaCart adalah platform belanja kebutuhan harian yang mengantarkan pesananmu dari Point RumaCart terdekat, bukan marketplace pihak ketiga." },
  { q: "Bagaimana cara pengiriman bekerja?", a: "Saat kamu checkout, sistem otomatis memilih Point RumaCart terdekat yang stoknya tersedia, lalu pesanan disiapkan dan diantar kurir kami." },
  { q: "Metode pembayaran apa saja yang tersedia?", a: "Saat ini tersedia COD, transfer bank, dan e-wallet (versi demo)." },
  { q: "Apakah bisa pickup sendiri ke Point?", a: "Bisa, pilih metode pengiriman 'Pickup' saat checkout." },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h2 className="mb-8 text-center text-xl font-bold">Pertanyaan Umum</h2>
      <div className="space-y-3">
        {FAQ.map((item, i) => (
          <div key={i} className="card cursor-pointer" onClick={() => setOpen(open === i ? null : i)}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{item.q}</p>
              <ChevronDown
                size={18}
                className={`transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </div>
            {open === i && <p className="mt-3 text-sm text-ink/60">{item.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
