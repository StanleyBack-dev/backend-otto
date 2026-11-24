import {
  isDeviceLive,
  normalizeDeviceName,
} from "@/modules/identity/domain/device";
import { checkPassword } from "@/modules/identity/domain/password-policy";
import { normalizeName } from "@/modules/identity/domain/user";
import {
  composeRefreshToken,
  parseRefreshToken,
} from "@/modules/identity/domain/refresh-token";
import {
  applyLocationChange,
  applySettingsChange,
  DEFAULT_SETTINGS,
  InvalidSettingsError,
} from "@/modules/identity/domain/user-settings";

const NOW = new Date("2026-11-23T12:00:00Z");
const ID = "0b6c2f0e-4a1d-4c5e-9f3a-2b7d8e9f0a1b";

describe("password policy", () => {
  it("accepts a long password with letters and digits", () => {
    expect(checkPassword("cafe-com-leite-42")).toEqual([]);
  });

  it("lists every rule broken", () => {
    expect(checkPassword("abc")).toEqual([
      "pelo menos 10 caracteres",
      "um número",
    ]);
    expect(
      checkPassword("stanley2026abc", { email: "stanley@example.com" }),
    ).toContain("nada do seu e-mail");
  });
});

describe("refresh token", () => {
  it("round-trips the device id and the secret", () => {
    const secret = "s".repeat(43);
    expect(parseRefreshToken(composeRefreshToken(ID, secret))).toEqual({
      sessionId: ID,
      secret,
    });
  });

  it("rejects malformed tokens", () => {
    expect(parseRefreshToken("nope")).toBeNull();
    expect(parseRefreshToken(`${ID}.short`)).toBeNull();
  });
});

describe("device", () => {
  it("is live until removed or expired", () => {
    const future = new Date(NOW.getTime() + 1000);
    expect(isDeviceLive({ revokedAt: null, expiresAt: future }, NOW)).toBe(
      true,
    );
    expect(isDeviceLive({ revokedAt: NOW, expiresAt: future }, NOW)).toBe(
      false,
    );
    expect(isDeviceLive({ revokedAt: null, expiresAt: NOW }, NOW)).toBe(false);
  });

  it("normalizes the name", () => {
    expect(normalizeDeviceName("  PC   do  quarto ")).toBe("PC do quarto");
    expect(normalizeDeviceName("x".repeat(80))).toHaveLength(60);
  });
});

describe("settings", () => {
  it("changes only the fields sent", () => {
    const next = applySettingsChange(DEFAULT_SETTINGS, {
      speechRate: 1.256,
      language: "en-us",
    });
    expect(next.speechRate).toBe(1.26);
    expect(next.language).toBe("en-US");
    expect(next.assistantName).toBe("Otto");
  });

  it("accepts a valid briefing time and refuses an invalid one", () => {
    expect(
      applySettingsChange(DEFAULT_SETTINGS, { briefingTime: "06:30" })
        .briefingTime,
    ).toBe("06:30");
    expect(
      applySettingsChange(DEFAULT_SETTINGS, { briefingTime: "23:59" })
        .briefingTime,
    ).toBe("23:59");
    for (const briefingTime of ["24:00", "7:00", "06:60", "ab:cd"]) {
      expect(() =>
        applySettingsChange(DEFAULT_SETTINGS, { briefingTime }),
      ).toThrow(InvalidSettingsError);
    }
  });

  it("rejects invalid values", () => {
    expect(() =>
      applySettingsChange(DEFAULT_SETTINGS, { timeZone: "Mars/Base" }),
    ).toThrow(InvalidSettingsError);
    expect(() =>
      applySettingsChange(DEFAULT_SETTINGS, { speechRate: 3 }),
    ).toThrow(InvalidSettingsError);
    expect(() =>
      applySettingsChange(DEFAULT_SETTINGS, { assistantName: " " }),
    ).toThrow(InvalidSettingsError);
  });

  it("stores the reported location and follows its time zone", () => {
    const next = applyLocationChange(
      DEFAULT_SETTINGS,
      {
        latitude: -16.6868912,
        longitude: -49.2647943,
        name: " Goiânia - GO ",
        timeZone: "America/Sao_Paulo",
      },
      NOW,
    );
    expect(next.location).toEqual({
      name: "Goiânia - GO",
      latitude: -16.686891,
      longitude: -49.264794,
      updatedAt: NOW,
    });
    const moved = applyLocationChange(
      next,
      { latitude: 38.72, longitude: -9.14, timeZone: "Europe/Lisbon" },
      NOW,
    );
    expect(moved.timeZone).toBe("Europe/Lisbon");
    expect(moved.location?.name).toBeNull();
  });

  it("rejects coordinates out of range", () => {
    expect(() =>
      applyLocationChange(
        DEFAULT_SETTINGS,
        { latitude: 91, longitude: 0 },
        NOW,
      ),
    ).toThrow(InvalidSettingsError);
  });
});

describe("normalizeName", () => {
  it("trims and limits the owner name", () => {
    expect(normalizeName("  Stanley   Rodrigues ")).toBe("Stanley Rodrigues");
    expect(normalizeName("A")).toBeNull();
    expect(normalizeName("x".repeat(121))).toBeNull();
  });
});
