import { calcVoucherDiscount } from "./voucher.service";

describe("calcVoucherDiscount", () => {
  it("menghitung diskon PERCENT sesuai persentase", () => {
    const voucher = { discountType: "PERCENT" as const, discountAmount: 10, maxDiscount: null };
    expect(calcVoucherDiscount(voucher, 100000)).toBe(10000);
  });

  it("membatasi diskon PERCENT sampai maxDiscount", () => {
    const voucher = { discountType: "PERCENT" as const, discountAmount: 50, maxDiscount: 20000 };
    // 50% dari 100.000 = 50.000, tapi dibatasi maxDiscount 20.000
    expect(calcVoucherDiscount(voucher, 100000)).toBe(20000);
  });

  it("diskon PERCENT tidak pernah melebihi subtotal", () => {
    const voucher = { discountType: "PERCENT" as const, discountAmount: 90, maxDiscount: null };
    expect(calcVoucherDiscount(voucher, 1000)).toBeLessThanOrEqual(1000);
  });

  it("FLAT mengembalikan nilai apa adanya kalau di bawah subtotal", () => {
    const voucher = { discountType: "FLAT" as const, discountAmount: 15000, maxDiscount: null };
    expect(calcVoucherDiscount(voucher, 100000)).toBe(15000);
  });

  it("FLAT tidak pernah melebihi subtotal (misal subtotal kecil karena qty sedikit)", () => {
    const voucher = { discountType: "FLAT" as const, discountAmount: 15000, maxDiscount: null };
    expect(calcVoucherDiscount(voucher, 5000)).toBe(5000);
  });
});
