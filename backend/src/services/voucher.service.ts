// Helper hitung potongan voucher, dipakai bareng oleh voucher.controller.ts (saat validasi)
// dan order.service.ts (saat checkout beneran) supaya logikanya selalu konsisten.

interface VoucherLike {
  discountType: "FLAT" | "PERCENT";
  discountAmount: number;
  maxDiscount: number | null;
}

export function calcVoucherDiscount(voucher: VoucherLike, subtotal: number): number {
  if (voucher.discountType === "PERCENT") {
    let discount = Math.round((subtotal * voucher.discountAmount) / 100);
    if (voucher.maxDiscount != null) discount = Math.min(discount, voucher.maxDiscount);
    return Math.min(discount, subtotal);
  }
  // FLAT
  return Math.min(voucher.discountAmount, subtotal);
}
