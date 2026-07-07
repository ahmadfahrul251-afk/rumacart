// Kumpulan fungsi kecil yang dipakai berulang di banyak komponen.

export function formatRupiah(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
