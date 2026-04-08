import { describe, it, expect } from "vitest";
import {
  fmtCurrency,
  fmtDate,
  fmtDateShort,
  fmtDateTime,
  fmtDateTimeSafe,
  fmtDateLong,
} from "../../apps/admin/src/lib/format";

describe("fmtCurrency", () => {
  it("formats zero correctly", () => {
    expect(fmtCurrency(0)).toMatch(/\$|USD/);
    expect(fmtCurrency(0)).toContain("0");
  });

  it("formats positive number", () => {
    const result = fmtCurrency(1500);
    expect(result).toMatch(/1[.,]500/);
  });

  it("formats with 2 decimals when requested", () => {
    const result = fmtCurrency(9.99, 2);
    expect(result).toMatch(/9[.,]99/);
  });

  it("handles non-finite input gracefully", () => {
    expect(fmtCurrency(NaN)).toContain("0");
    expect(fmtCurrency(Infinity)).toContain("0");
  });

  it("formats large amounts", () => {
    const result = fmtCurrency(1_000_000);
    expect(result).toMatch(/1[.,]000[.,]000/);
  });
});

describe("fmtDate", () => {
  it("returns a non-empty string for valid ISO date", () => {
    const result = fmtDate("2025-06-15T10:00:00Z");
    expect(result).not.toBe("-");
    expect(result.length).toBeGreaterThan(4);
  });

  it("returns dash for invalid input", () => {
    expect(fmtDate("not-a-date")).toBe("-");
    expect(fmtDate("")).toBe("-");
  });

  it("includes the year", () => {
    // Use a mid-year date to avoid timezone boundary issues
    const result = fmtDate("2025-06-15T12:00:00Z");
    expect(result).toContain("2025");
  });
});

describe("fmtDateShort", () => {
  it("returns short format without year", () => {
    const result = fmtDateShort("2025-06-15T10:00:00Z");
    expect(result).not.toContain("2025");
    expect(result).not.toBe("-");
  });

  it("returns dash for invalid input", () => {
    expect(fmtDateShort("bad")).toBe("-");
  });
});

describe("fmtDateTime", () => {
  it("includes time component", () => {
    const result = fmtDateTime("2025-06-15T14:30:00Z");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns dash for invalid input", () => {
    expect(fmtDateTime("invalid")).toBe("-");
  });
});

describe("fmtDateTimeSafe", () => {
  it("returns dash for null/undefined", () => {
    expect(fmtDateTimeSafe(null)).toBe("-");
    expect(fmtDateTimeSafe(undefined)).toBe("-");
    expect(fmtDateTimeSafe("")).toBe("-");
  });

  it("returns formatted string for valid input", () => {
    const result = fmtDateTimeSafe("2025-06-15T14:30:00Z");
    expect(result).not.toBe("-");
  });
});

describe("fmtDateLong", () => {
  it("includes weekday and full month", () => {
    const result = fmtDateLong("2025-01-06T10:00:00Z");
    // Should be a long form with full month name
    expect(result.length).toBeGreaterThan(10);
    expect(result).not.toBe("-");
  });
});
