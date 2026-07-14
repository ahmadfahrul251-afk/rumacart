import { prisma } from "../config/db";

// Dipanggil otomatis setiap kali ada uang masuk/keluar (penjualan, belanja
// supplier, gaji, dst) supaya Dashboard Cashflow selalu real-time tanpa
// input manual dobel.
export async function recordCashflow(params: {
  type: "IN" | "OUT";
  category: string;
  amount: number;
  costAmount?: number;
  profitAmount?: number;
  // Kantong tujuan (Investasi/Inventaris/Profit) — dipakai untuk entry NON-penjualan.
  pocket?: "INVESTASI" | "INVENTARIS" | "PROFIT";
  description?: string;
  pointId?: string;
  refType?: string;
  refId?: string;
  createdById?: string;
}) {
  return prisma.cashflow.create({ data: params });
}
