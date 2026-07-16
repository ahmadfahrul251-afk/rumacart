jest.mock("../config/db", () => ({
  prisma: {
    productVariant: { findUnique: jest.fn() },
    fulfillmentPoint: { findUnique: jest.fn() },
    inventory: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    inventoryHistory: { create: jest.fn() },
  },
}));

import { prisma } from "../config/db";
import { claimProduct, updatePrice } from "./inventory.controller";

const mockPrisma = prisma as any;

function fakeReq(body: any = {}, params: any = {}, user: any = { role: "ADMIN", userId: "u1" }): any {
  return { body, params, user, query: {} };
}
function fakeRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  mockPrisma.productVariant.findUnique.mockResolvedValue({ id: "variant-1", minStock: 5 });
  mockPrisma.inventory.findUnique.mockResolvedValue(null); // belum pernah diklaim
  mockPrisma.inventory.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "inv-new", ...data }));
});

describe("claimProduct — RDH wajib isi basePrice", () => {
  it("ditolak (422) kalau RDH tidak isi basePrice", async () => {
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "rdh-1", type: "RDH" });
    const req = fakeReq({ variantId: "variant-1", pointId: "rdh-1" });
    const res = fakeRes();

    await claimProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Harga dasar") })
    );
    expect(mockPrisma.inventory.create).not.toHaveBeenCalled();
  });

  it("berhasil klaim RDH dengan basePrice, tidak ada sellPrice/discountPrice", async () => {
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "rdh-1", type: "RDH" });
    const req = fakeReq({ variantId: "variant-1", pointId: "rdh-1", basePrice: 5000 });
    const res = fakeRes();

    await claimProduct(req, res);

    const callArgs = mockPrisma.inventory.create.mock.calls[0][0];
    expect(callArgs.data.basePrice).toBe(5000);
    expect(callArgs.data).not.toHaveProperty("sellPrice");
    expect(callArgs.data).not.toHaveProperty("discountPrice");
    expect(res.status).not.toHaveBeenCalledWith(422);
  });
});

describe("claimProduct — Mart/Point wajib isi sellPrice + referensi basePrice RDH induk", () => {
  it("ditolak kalau Point belum terhubung ke RDH induk (parentHubId kosong)", async () => {
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "mart-1", type: "MART", parentHubId: null });
    const req = fakeReq({ variantId: "variant-1", pointId: "mart-1", sellPrice: 9000 });
    const res = fakeRes();

    await claimProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("RDH induk") })
    );
  });

  it("ditolak kalau RDH induk belum klaim/atur harga dasar varian ini", async () => {
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "mart-1", type: "MART", parentHubId: "rdh-1" });
    mockPrisma.inventory.findUnique
      .mockResolvedValueOnce(null) // existing claim check di Mart -> belum ada
      .mockResolvedValueOnce(null); // parentInv (RDH) -> belum klaim sama sekali
    const req = fakeReq({ variantId: "variant-1", pointId: "mart-1", sellPrice: 9000 });
    const res = fakeRes();

    await claimProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("RDH induk belum mengklaim") })
    );
  });

  it("ditolak kalau sellPrice tidak diisi", async () => {
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "mart-1", type: "MART", parentHubId: "rdh-1" });
    mockPrisma.inventory.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ basePrice: 5000 }); // RDH sudah punya basePrice
    const req = fakeReq({ variantId: "variant-1", pointId: "mart-1" });
    const res = fakeRes();

    await claimProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Harga jual") })
    );
  });

  it("berhasil klaim dengan sellPrice di atas basePrice -> belowBasePrice false", async () => {
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "mart-1", type: "MART", parentHubId: "rdh-1" });
    mockPrisma.inventory.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ basePrice: 5000 });
    const req = fakeReq({ variantId: "variant-1", pointId: "mart-1", sellPrice: 7000 });
    const res = fakeRes();

    await claimProduct(req, res);

    expect(mockPrisma.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ basePrice: 5000, sellPrice: 7000 }) })
    );
    expect(res.json.mock.calls[0][0].data.belowBasePrice).toBe(false);
  });

  it("tetap boleh klaim dengan sellPrice DI BAWAH basePrice, tapi belowBasePrice true (bukan diblokir)", async () => {
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "mart-1", type: "MART", parentHubId: "rdh-1" });
    mockPrisma.inventory.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ basePrice: 5000 });
    const req = fakeReq({ variantId: "variant-1", pointId: "mart-1", sellPrice: 4000 });
    const res = fakeRes();

    await claimProduct(req, res);

    expect(res.status).not.toHaveBeenCalledWith(422);
    expect(res.json.mock.calls[0][0].data.belowBasePrice).toBe(true);
  });
});

describe("claimProduct — klaim yang sudah ada tidak dianggap error", () => {
  it("mengembalikan inventory yang sudah ada tanpa membuat baris baru", async () => {
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "mart-1", type: "MART", parentHubId: "rdh-1" });
    mockPrisma.inventory.findUnique.mockResolvedValueOnce({ id: "inv-existing" });
    const req = fakeReq({ variantId: "variant-1", pointId: "mart-1", sellPrice: 7000 });
    const res = fakeRes();

    await claimProduct(req, res);

    expect(mockPrisma.inventory.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("sudah ada di inventaris") })
    );
  });
});

describe("updatePrice", () => {
  it("RDH wajib isi basePrice", async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue({ id: "inv-1", pointId: "rdh-1", basePrice: 5000 });
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "rdh-1", type: "RDH" });
    const req = fakeReq({}, { id: "inv-1" });
    const res = fakeRes();

    await updatePrice(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("Mart/Point set sellPrice baru & tandai belowBasePrice sesuai basePrice yang tersimpan", async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue({ id: "inv-1", pointId: "mart-1", basePrice: 5000, sellPrice: 8000 });
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "mart-1", type: "MART" });
    mockPrisma.inventory.update.mockResolvedValue({ id: "inv-1", sellPrice: 4000 });
    const req = fakeReq({ sellPrice: 4000 }, { id: "inv-1" });
    const res = fakeRes();

    await updatePrice(req, res);

    expect(mockPrisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inv-1" }, data: { sellPrice: 4000 } })
    );
    expect(res.json.mock.calls[0][0].data.belowBasePrice).toBe(true);
  });

  it("404 kalau baris inventory tidak ditemukan", async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue(null);
    const req = fakeReq({ sellPrice: 1000 }, { id: "inv-ghost" });
    const res = fakeRes();

    await updatePrice(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
