jest.mock("../config/db", () => ({
  prisma: {
    inventory: { findUnique: jest.fn() },
    fulfillmentPoint: { findMany: jest.fn() },
  },
}));

import { prisma } from "../config/db";
import { pointHasStockForCart, listEligiblePoints, findBackOrderOption, selectBestPoint } from "./pointSelector.service";

const mockPrisma = prisma as any;
const findUniqueInv = mockPrisma.inventory.findUnique as jest.Mock;
const findManyPoint = mockPrisma.fulfillmentPoint.findMany as jest.Mock;

// Bandung sebagai titik acuan customer.
const CUSTOMER_LAT = -6.9175;
const CUSTOMER_LON = 107.6191;

function point(overrides: Partial<any> = {}) {
  return {
    id: "pt-1",
    name: "Point A",
    code: "PNT-A",
    city: "Bandung",
    type: "POINT",
    latitude: -6.9175,
    longitude: 107.6191,
    ...overrides,
  };
}

describe("pointHasStockForCart", () => {
  it("true kalau semua item stoknya cukup", async () => {
    findUniqueInv.mockResolvedValue({ stock: 10 });
    const result = await pointHasStockForCart("pt-1", [{ variantId: "v1", qty: 2 }]);
    expect(result).toBe(true);
  });

  it("false kalau salah satu item stoknya kurang", async () => {
    findUniqueInv
      .mockResolvedValueOnce({ stock: 10 })
      .mockResolvedValueOnce({ stock: 1 });
    const result = await pointHasStockForCart("pt-1", [
      { variantId: "v1", qty: 2 },
      { variantId: "v2", qty: 5 },
    ]);
    expect(result).toBe(false);
  });

  it("false kalau varian belum diklaim di Point ini (tidak ada baris inventory)", async () => {
    findUniqueInv.mockResolvedValue(null);
    const result = await pointHasStockForCart("pt-1", [{ variantId: "v1", qty: 1 }]);
    expect(result).toBe(false);
  });
});

describe("listEligiblePoints", () => {
  it("Point diprioritaskan di atas Mart, keduanya urut dari yang terdekat", async () => {
    const nearPoint = point({ id: "pt-near", type: "POINT", latitude: -6.9175, longitude: 107.6191 }); // Bandung, dekat
    const farPoint = point({ id: "pt-far", type: "POINT", latitude: -6.2088, longitude: 106.8456 }); // Jakarta, jauh
    const nearMart = point({ id: "mart-near", type: "MART", latitude: -6.92, longitude: 107.62 });

    findManyPoint.mockResolvedValue([farPoint, nearMart, nearPoint]);
    findUniqueInv.mockResolvedValue({ stock: 100 }); // semua lokasi dianggap punya stok cukup

    const result = await listEligiblePoints([{ variantId: "v1", qty: 1 }], CUSTOMER_LAT, CUSTOMER_LON, "Bandung");

    // Semua POINT harus muncul sebelum semua MART
    const typesInOrder = result.map((r) => r.type);
    const lastPointIndex = typesInOrder.lastIndexOf("POINT");
    const firstMartIndex = typesInOrder.indexOf("MART");
    expect(lastPointIndex).toBeLessThan(firstMartIndex);

    // Di antara sesama POINT, yang lebih dekat (Bandung) harus lebih dulu dari yang jauh (Jakarta)
    const pointsOnly = result.filter((r) => r.type === "POINT");
    expect(pointsOnly[0].pointId).toBe("pt-near");
    expect(pointsOnly[1].pointId).toBe("pt-far");
  });

  it("Point yang stoknya tidak cukup tidak ikut muncul di hasil", async () => {
    findManyPoint.mockResolvedValue([point({ id: "pt-1" }), point({ id: "pt-2" })]);
    findUniqueInv
      .mockResolvedValueOnce({ stock: 100 }) // pt-1: cukup
      .mockResolvedValueOnce({ stock: 0 }); // pt-2: habis

    const result = await listEligiblePoints([{ variantId: "v1", qty: 1 }], null, null, null);
    expect(result.map((r) => r.pointId)).toEqual(["pt-1"]);
  });
});

describe("findBackOrderOption", () => {
  it("mengembalikan null kalau tidak ada RDH dengan stok cukup", async () => {
    findManyPoint.mockResolvedValue([]);
    const result = await findBackOrderOption([{ variantId: "v1", qty: 1 }], null, null, null);
    expect(result).toBeNull();
  });

  it("mengembalikan RDH dengan isBackOrder true kalau stoknya cukup", async () => {
    findManyPoint.mockResolvedValue([point({ id: "rdh-1", type: "RDH", city: "Bandung" })]);
    findUniqueInv.mockResolvedValue({ stock: 50 });
    const result = await findBackOrderOption([{ variantId: "v1", qty: 1 }], null, null, null);
    expect(result).toEqual(
      expect.objectContaining({ pointId: "rdh-1", isBackOrder: true })
    );
  });
});

describe("selectBestPoint", () => {
  it("melempar error kalau tidak ada Point/Mart yang stoknya cukup", async () => {
    findManyPoint.mockResolvedValue([]);
    await expect(selectBestPoint([{ variantId: "v1", qty: 1 }], null, null, null)).rejects.toThrow(
      "Tidak ada Point atau Mart"
    );
  });

  it("mengembalikan pointId eligible pertama", async () => {
    findManyPoint.mockResolvedValue([point({ id: "pt-1" })]);
    findUniqueInv.mockResolvedValue({ stock: 5 });
    const result = await selectBestPoint([{ variantId: "v1", qty: 1 }], null, null, null);
    expect(result).toBe("pt-1");
  });
});
