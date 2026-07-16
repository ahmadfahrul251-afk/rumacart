jest.mock("../config/db", () => ({
  prisma: {
    deliveryArea: { findFirst: jest.fn() },
  },
}));

import { prisma } from "../config/db";
import { getDeliveryCost } from "./deliveryArea.service";

const mockPrisma = prisma as any;
const findFirst = mockPrisma.deliveryArea.findFirst as jest.Mock;

describe("getDeliveryCost", () => {
  it("langsung tidak tersedia kalau kecamatan kosong, tanpa query DB", async () => {
    const result = await getDeliveryCost("pt-1", null, "Bandung");
    expect(result).toEqual({ available: false, cost: 0 });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("tersedia dengan biaya sesuai kalau kecamatan cocok & area aktif", async () => {
    findFirst.mockResolvedValue({ cost: 12000 });
    const result = await getDeliveryCost("pt-1", "Cibeunying Kidul", "Bandung");
    expect(result).toEqual({ available: true, cost: 12000 });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pointId: "pt-1", isActive: true }),
      })
    );
  });

  it("tidak tersedia kalau Point ini tidak melayani kecamatan tersebut", async () => {
    findFirst.mockResolvedValue(null);
    const result = await getDeliveryCost("pt-1", "Kecamatan Antah Berantah", "Bandung");
    expect(result).toEqual({ available: false, cost: 0 });
  });
});
