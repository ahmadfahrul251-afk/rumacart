jest.mock("../config/db", () => ({
  prisma: {
    address: { findUnique: jest.fn() },
    inventory: { findMany: jest.fn(), update: jest.fn() },
    inventoryHistory: { create: jest.fn() },
    fulfillmentPoint: { findUnique: jest.fn() },
    voucher: { findUnique: jest.fn(), update: jest.fn() },
    order: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("./pointSelector.service");
jest.mock("./cashflow.service");
jest.mock("./restockRequest.service");
jest.mock("./deliveryArea.service");

import { prisma } from "../config/db";
import { createOrder } from "./order.service";
import * as pointSelector from "./pointSelector.service";
import * as deliveryArea from "./deliveryArea.service";
import { recordCashflow } from "./cashflow.service";
import { checkAndCreateRestockRequest } from "./restockRequest.service";

const mockPrisma = prisma as any;
const mockPointSelector = pointSelector as jest.Mocked<typeof pointSelector>;
const mockDeliveryArea = deliveryArea as jest.Mocked<typeof deliveryArea>;
const mockCheckAndCreateRestockRequest = checkAndCreateRestockRequest as jest.Mock;

// $transaction dalam kode asli dipanggil sebagai prisma.$transaction(async (tx) => {...}, opts).
// Di test, `tx` cukup pakai object prisma yang sama supaya order.create/inventory.update/dst
// tetap bisa di-assert lewat mock yang sama.
function wireTransaction() {
  mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
}

const CART = [{ variantId: "variant-1", qty: 2 }];

function baseInput(overrides: Partial<any> = {}) {
  return {
    customerId: "cust-1",
    items: CART,
    shippingMethod: "PICKUP" as const,
    paymentMethod: "COD" as const,
    ...overrides,
  };
}

beforeEach(() => {
  wireTransaction();
  mockPrisma.order.create.mockResolvedValue({ id: "order-1" });
  mockPrisma.inventory.update.mockResolvedValue({ id: "inv-1" });
  mockPointSelector.pointHasStockForCart.mockResolvedValue(true);
  // Dipanggil dengan `.catch()` langsung di order.service.ts, jadi mock-nya WAJIB
  // resolve ke Promise asli (auto-mock default cuma `undefined`, tidak punya .catch).
  mockCheckAndCreateRestockRequest.mockResolvedValue(undefined);
});

describe("createOrder — harga per lokasi (Round 17)", () => {
  it("pakai discountPrice kalau ada, meskipun sellPrice juga ada", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: 5000, sellPrice: 8000, discountPrice: 7000 },
    ]);

    const order = await createOrder(baseInput({ pointId: "pt-mart-1" }));

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 7000 * 2, // discountPrice x qty
          costTotal: 5000 * 2, // basePrice x qty
        }),
      })
    );
    expect(order).toEqual({ id: "order-1" });
  });

  it("pakai sellPrice kalau tidak ada discountPrice", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: 5000, sellPrice: 8000, discountPrice: null },
    ]);

    await createOrder(baseInput({ pointId: "pt-mart-1" }));

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subtotal: 8000 * 2 }) })
    );
  });

  it("Back Order dari RDH pakai basePrice sebagai harga darurat (RDH tidak punya sellPrice)", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: 5000, sellPrice: null, discountPrice: null },
    ]);
    mockPrisma.fulfillmentPoint.findUnique.mockResolvedValue({ id: "rdh-1", type: "RDH" });

    const order = await createOrder(baseInput({ pointId: "rdh-1" }));

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 5000 * 2, isBackOrder: true }),
      })
    );
    expect(order).toEqual({ id: "order-1" });
  });

  it("gagal kalau varian tidak tersedia (belum diklaim) di lokasi yang dipilih", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([]); // tidak ada baris Inventory sama sekali

    await expect(createOrder(baseInput({ pointId: "pt-mart-1" }))).rejects.toThrow(
      "tidak tersedia di lokasi ini"
    );
  });

  it("gagal kalau baris Inventory ada tapi harga belum diatur sama sekali", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: null, sellPrice: null, discountPrice: null },
    ]);

    await expect(createOrder(baseInput({ pointId: "pt-mart-1" }))).rejects.toThrow(
      "Harga produk di lokasi ini belum diatur"
    );
  });

  it("menandai belowCost saat harga jual (setelah diskon voucher) di bawah modal", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: 9000, sellPrice: 9500, discountPrice: null },
    ]);

    await createOrder(baseInput({ pointId: "pt-mart-1" }));

    // subtotal 19000 vs costTotal 18000 -> masih untung -> belowCost false
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ belowCost: false }) })
    );
  });
});

describe("createOrder — smart order routing & validasi", () => {
  it("melempar error kalau stok di Point yang dipilih customer ternyata sudah habis", async () => {
    mockPointSelector.pointHasStockForCart.mockResolvedValue(false);
    await expect(createOrder(baseInput({ pointId: "pt-mart-1" }))).rejects.toThrow(
      "sudah tidak mencukupi"
    );
  });

  it("fallback ke selectBestPoint kalau customer tidak pilih Point", async () => {
    mockPointSelector.selectBestPoint.mockResolvedValue("pt-auto");
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: 5000, sellPrice: 8000, discountPrice: null },
    ]);

    await createOrder(baseInput());

    expect(mockPointSelector.selectBestPoint).toHaveBeenCalled();
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pointId: "pt-auto" }) })
    );
  });

  it("fallback ke Back Order RDH kalau tidak ada Point/Mart yang stoknya cukup", async () => {
    mockPointSelector.selectBestPoint.mockRejectedValue(new Error("kosong"));
    mockPointSelector.findBackOrderOption.mockResolvedValue({
      pointId: "rdh-1",
      name: "RDH A",
      code: "RDH-A",
      city: "Bandung",
      isBackOrder: true,
    });
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: 5000, sellPrice: null, discountPrice: null },
    ]);

    await createOrder(baseInput());

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pointId: "rdh-1", isBackOrder: true }) })
    );
  });

  it("melempar error kalau stok habis total di seluruh jaringan (tidak ada Back Order juga)", async () => {
    mockPointSelector.selectBestPoint.mockRejectedValue(new Error("kosong"));
    mockPointSelector.findBackOrderOption.mockResolvedValue(null);

    await expect(createOrder(baseInput())).rejects.toThrow("Stok habis di seluruh jaringan");
  });
});

describe("createOrder — ongkir DELIVERY", () => {
  beforeEach(() => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: 5000, sellPrice: 8000, discountPrice: null },
    ]);
  });

  it("ditolak kalau Point tidak melayani kecamatan alamat tujuan", async () => {
    mockDeliveryArea.getDeliveryCost.mockResolvedValue({ available: false, cost: 0 });

    await expect(
      createOrder(baseInput({ pointId: "pt-mart-1", shippingMethod: "DELIVERY", addressId: "addr-1" }))
    ).rejects.toThrow("tidak melayani pengiriman");
  });

  it("shippingCost ikut ditambahkan ke total kalau DELIVERY tersedia", async () => {
    mockDeliveryArea.getDeliveryCost.mockResolvedValue({ available: true, cost: 10000 });

    await createOrder(baseInput({ pointId: "pt-mart-1", shippingMethod: "DELIVERY", addressId: "addr-1" }));

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shippingCost: 10000, total: 8000 * 2 + 10000 }),
      })
    );
  });

  it("PICKUP selalu gratis, tidak pernah query delivery area", async () => {
    await createOrder(baseInput({ pointId: "pt-mart-1", shippingMethod: "PICKUP" }));
    expect(mockDeliveryArea.getDeliveryCost).not.toHaveBeenCalled();
  });
});

describe("createOrder — cashflow", () => {
  it("mencatat cashflow masuk dengan costAmount & profitAmount yang benar", async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { variantId: "variant-1", basePrice: 5000, sellPrice: 8000, discountPrice: null },
    ]);

    await createOrder(baseInput({ pointId: "pt-mart-1" }));

    expect(recordCashflow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "IN",
        amount: 16000,
        costAmount: 10000,
        profitAmount: 6000,
        pointId: "pt-mart-1",
      })
    );
  });
});
