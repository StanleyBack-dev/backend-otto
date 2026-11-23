import { safeCompare } from "@/common/security/safe-compare";

describe("safeCompare", () => {
  it("accepts equal strings", () => {
    expect(safeCompare("a-long-secret", "a-long-secret")).toBe(true);
  });

  it("rejects different strings, including different lengths", () => {
    expect(safeCompare("a-long-secret", "a-long-secreT")).toBe(false);
    expect(safeCompare("short", "a-much-longer-value")).toBe(false);
    expect(safeCompare("", "secret")).toBe(false);
  });
});
