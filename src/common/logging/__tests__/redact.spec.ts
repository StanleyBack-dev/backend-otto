import { redact } from "@/common/logging/redact";

describe("redact", () => {
  it("masks e-mails, bearer tokens, JWTs and phone-like numbers", () => {
    const text =
      "user stanley@example.com Bearer abcdefgh12345678 eyJa.eyJb.sig phone (62) 99999-8888";
    const result = redact(text);
    expect(result).toContain("s***@example.com");
    expect(result).toContain("Bearer [redacted]");
    expect(result).toContain("[jwt]");
    expect(result).toContain("[número]");
    expect(result).not.toContain("99999-8888");
  });

  it("keeps short numbers such as times and counts", () => {
    expect(redact("took 1500 ms at 08:15")).toBe("took 1500 ms at 08:15");
  });
});
