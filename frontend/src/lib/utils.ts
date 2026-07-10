// Kumpulan fungsi kecil yang dipakai berulang di banyak komponen.

export function formatRupiah(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Menentukan halaman dashboard yang sesuai untuk tiap role.
// Customer tidak punya dashboard khusus, jadi tetap di halaman utama ("/").
export function getDashboardPath(role?: string): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
    case "ADMIN_POINT":
      return "/dashboard/admin";
    case "GUDANG":
      return "/dashboard/gudang";
    case "KASIR":
      return "/dashboard/kasir";
    case "KURIR":
      return "/dashboard/kurir";
    default:
      return "/";
  }
}
