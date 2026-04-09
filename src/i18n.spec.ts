import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { i18n } from "./i18n.ts";

const documentElement = { lang: "en" };

beforeEach(() => {
  // Provide minimal DOM globals for the I18n class
  vi.stubGlobal("document", { documentElement });
  vi.stubGlobal("navigator", { language: "en-US" });
  documentElement.lang = "en";
});

describe("i18n.lang", () => {
  test("returns first two characters of document lang", () => {
    documentElement.lang = "de-AT";
    expect(i18n.lang).toBe("de");
  });

  test("returns first two characters for simple lang", () => {
    documentElement.lang = "it";
    expect(i18n.lang).toBe("it");
  });

  test("falls back to 'en' when lang is empty", () => {
    documentElement.lang = "";
    expect(i18n.lang).toBe("en");
  });
});

describe("i18n.message", () => {
  test("returns message from en.json", () => {
    expect(i18n.message("linea:parameter:HS")).toBe("Snow Height");
  });

  test("falls back to en.json for unknown language", () => {
    documentElement.lang = "xx";
    expect(i18n.message("linea:parameter:HS")).toBe("Snow Height");
  });

  test("returns id when message not found", () => {
    documentElement.lang = "en";
    expect(i18n.message("linea:unknown:key" as any)).toBe("linea:unknown:key");
  });
});

describe("i18n.number", () => {
  test("returns dash for null", () => {
    expect(i18n.number(null)).toBe("–");
  });

  test("returns dash for undefined", () => {
    expect(i18n.number(undefined)).toBe("–");
  });

  test("returns dash for NaN", () => {
    expect(i18n.number(NaN)).toBe("–");
  });

  test("returns dash for Infinity", () => {
    expect(i18n.number(Infinity)).toBe("–");
  });

  test("formats integer without grouping below 10000", () => {
    expect(i18n.number(1234)).toBe("1234");
  });

  test("formats integer with grouping at 10000", () => {
    const result = i18n.number(10000);
    expect(result).toMatch(/10.000/);
  });

  test("formats temperature with one decimal", () => {
    expect(i18n.number(5, undefined, "℃")).toMatch(/^5\.0\s℃$/);
  });

  test("formats zero temperature", () => {
    expect(i18n.number(0, undefined, "℃")).toMatch(/^0\.0\s℃$/);
  });

  test("formats negative temperature", () => {
    expect(i18n.number(-3.7, undefined, "℃")).toMatch(/^-3\.7\s℃$/);
  });

  test("appends unit", () => {
    expect(i18n.number(100, undefined, "cm")).toMatch(/^100\scm$/);
  });

  test("no unit appended when unit is empty string", () => {
    expect(i18n.number(42, undefined, "")).toBe("42");
  });

  test("no unit appended when unit is undefined", () => {
    expect(i18n.number(42)).toBe("42");
  });

  test("respects custom opts", () => {
    expect(i18n.number(3.14159, { maximumFractionDigits: 2 })).toBe("3.14");
  });
});

describe("i18n.time", () => {
  test("returns empty string for invalid date string", () => {
    expect(i18n.time("not-a-date")).toBe("");
  });

  test("returns empty string for NaN number", () => {
    expect(i18n.time(NaN)).toBe("");
  });

  test("formats a Date object", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    const result = i18n.time(date);
    expect(result).toBe("1/15/2024");
  });

  test("formats a date string", () => {
    const result = i18n.time("2024-01-15T12:00:00Z");
    expect(result).toBe("1/15/2024");
  });

  test("formats a timestamp number", () => {
    const date = Date.parse("2024-01-15T12:00:00Z");
    const result = i18n.time(date);
    expect(result).toBe("1/15/2024");
  });

  test("uses en-GB for English", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    const date = new Date("2024-01-15T12:00:00Z");
    const result = i18n.time(date, { day: "numeric", month: "numeric", year: "numeric" });
    expect(result).toBe("15/01/2024");
    vi.stubGlobal("navigator", { language: "en-US" });
  });

  test("uses de-AT for German", () => {
    documentElement.lang = "de";
    vi.stubGlobal("navigator", { language: "en-US" });
    const date = new Date("2024-01-15T12:00:00Z");
    const result = i18n.time(date, { day: "numeric", month: "numeric", year: "numeric" });
    expect(result).toBe("15.1.2024");
    vi.stubGlobal("navigator", { language: "en-US" });
  });

  test("uses navigator.language when it matches lang prefix", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    const date = new Date("2024-01-15T12:00:00Z");
    const result = i18n.time(date, { day: "numeric", month: "numeric", year: "numeric" });
    expect(result).toBe("1/15/2024");
  });

  test("passes opts to DateTimeFormat", () => {
    vi.stubGlobal("navigator", { language: "en-US" });
    const date = new Date("2024-06-15T12:00:00Z");
    const result = i18n.time(date, { month: "long" });
    expect(result).toEqual("June");
  });

  test("falls back to lang for unknown language", () => {
    documentElement.lang = "fr";
    vi.stubGlobal("navigator", { language: "en-US" });
    const date = new Date("2024-06-15T12:00:00Z");
    const result = i18n.time(date, { month: "long" });
    expect(result).toEqual("juin");
    vi.stubGlobal("navigator", { language: "en-US" });
  });
});

describe("i18n.timezone", () => {
  test("returns a timezone string", () => {
    const tz = i18n.timezone();
    expect(typeof tz).toBe("string");
    expect(tz.length).toBeGreaterThan(0);
  });
});
