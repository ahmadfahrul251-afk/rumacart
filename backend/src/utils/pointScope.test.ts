import { scopedPointId, resolveWritePointId, canAccessPoint } from "./pointScope";

function fakeReq(user?: any, query: any = {}, ): any {
  return { user, query };
}

describe("scopedPointId", () => {
  it("ADMIN_POINT selalu dikunci ke managedPointId, abaikan query", () => {
    const req = fakeReq({ role: "ADMIN_POINT", managedPointId: "pt-1" }, { pointId: "pt-999" });
    expect(scopedPointId(req)).toBe("pt-1");
  });

  it("ADMIN boleh pilih pointId lewat query", () => {
    const req = fakeReq({ role: "ADMIN" }, { pointId: "pt-5" });
    expect(scopedPointId(req)).toBe("pt-5");
  });

  it("ADMIN tanpa query pointId mengembalikan undefined (lihat semua Point)", () => {
    const req = fakeReq({ role: "ADMIN" }, {});
    expect(scopedPointId(req)).toBeUndefined();
  });
});

describe("resolveWritePointId", () => {
  it("ADMIN_POINT dipaksa pakai Point-nya sendiri walau body kirim pointId lain", () => {
    const req = fakeReq({ role: "ADMIN_POINT", managedPointId: "pt-1" });
    expect(resolveWritePointId(req, "pt-lain")).toBe("pt-1");
  });

  it("Role lain pakai pointId dari body", () => {
    const req = fakeReq({ role: "GUDANG" });
    expect(resolveWritePointId(req, "pt-7")).toBe("pt-7");
  });
});

describe("canAccessPoint", () => {
  it("ADMIN_POINT cuma boleh akses Point miliknya sendiri", () => {
    const req = fakeReq({ role: "ADMIN_POINT", managedPointId: "pt-1" });
    expect(canAccessPoint(req, "pt-1")).toBe(true);
    expect(canAccessPoint(req, "pt-2")).toBe(false);
  });

  it("Role selain ADMIN_POINT tidak dibatasi", () => {
    const req = fakeReq({ role: "SUPER_ADMIN" });
    expect(canAccessPoint(req, "pt-apapun")).toBe(true);
  });
});
