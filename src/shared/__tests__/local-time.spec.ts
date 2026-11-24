import {
  addDays,
  isLocalDate,
  localDate,
  localTime,
  startOfLocalDate,
} from "@/shared/domain/local-time";

describe("local time", () => {
  const instant = new Date("2026-11-24T02:30:00Z");

  it("reads the date and time in a time zone", () => {
    expect(localDate(instant, "America/Sao_Paulo")).toBe("2026-11-23");
    expect(localTime(instant, "America/Sao_Paulo")).toBe("23:30");
    expect(localDate(instant, "Europe/Lisbon")).toBe("2026-11-24");
  });

  it("finds when a local day starts, also across daylight saving", () => {
    expect(startOfLocalDate("2026-11-23", "America/Sao_Paulo")).toEqual(
      new Date("2026-11-23T03:00:00Z"),
    );
    expect(startOfLocalDate("2026-07-01", "Europe/Lisbon")).toEqual(
      new Date("2026-06-30T23:00:00Z"),
    );
    expect(startOfLocalDate("2026-03-08", "America/New_York")).toEqual(
      new Date("2026-03-08T05:00:00Z"),
    );
  });

  it("validates and moves calendar dates", () => {
    expect(isLocalDate("2026-02-29")).toBe(false);
    expect(isLocalDate("2028-02-29")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
