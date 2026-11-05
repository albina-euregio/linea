/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { parseForecast, parseForecastLatLon } from "./forecast-option";

const aromeModel = { label: { upper: "AROME Forecast", lower: "(GeoSphere Austria)" } };
const arome = { model: aromeModel, latlong: "47.18,11.29" };
const myModel = { label: { upper: "My model", lower: "(ACME)" } };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("forecast attribute", () => {
  test("no forecast", () => {
    expect(parseForecast(null)).toEqual([]);
    expect(parseForecast("  ")).toEqual([]);
  });

  test("just latlong loads the stored model", () => {
    expect(parseForecast('{"latlong":"47.18, 11.29"}')).toEqual([arome]);
    expect(parseForecast('{"latlong":[47.18,11.29]}')).toEqual([arome]);
  });

  test("just model is a forecast contained in the SMET file", () => {
    expect(parseForecast(JSON.stringify({ model: myModel }))).toEqual([{ model: myModel }]);
  });

  test("model and latlong", () => {
    expect(parseForecast(JSON.stringify({ model: myModel, latlong: "47.18,11.29" }))).toEqual([
      { model: myModel, latlong: "47.18,11.29" },
    ]);
  });

  test("the lower label is optional", () => {
    const model = { label: { upper: "My model" } };
    expect(parseForecast(JSON.stringify({ model }))).toEqual([{ model }]);
  });

  test("t0 is parsed to a date", () => {
    const value = { model: { t0: "2026-11-05T12:00:00Z", label: myModel.label } };
    expect(parseForecast(JSON.stringify(value))).toEqual([
      { model: { t0: new Date("2026-11-05T12:00:00Z"), label: myModel.label } },
    ]);
  });

  test("a model without label keeps t0 and loads the stored label", () => {
    const value = { model: { t0: "2026-11-05T12:00:00Z" }, latlong: "47.18,11.29" };
    expect(parseForecast(JSON.stringify(value))).toEqual([
      {
        model: { t0: new Date("2026-11-05T12:00:00Z"), label: aromeModel.label },
        latlong: "47.18,11.29",
      },
    ]);
  });

  test("labelOffset is kept when the stored label is loaded", () => {
    const value = { model: { labelOffset: { x: 10, y: -5 } }, latlong: "47.18,11.29" };
    expect(parseForecast(JSON.stringify(value))).toEqual([
      {
        model: { labelOffset: { x: 10, y: -5 }, label: aromeModel.label },
        latlong: "47.18,11.29",
      },
    ]);
  });

  test("array with one forecast per station", () => {
    const value = JSON.stringify([{ latlong: "47.18,11.29" }, null, { model: myModel }]);
    expect(parseForecast(value)).toEqual([arome, undefined, { model: myModel }]);
  });

  test("invalid values are ignored", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseForecast("47.18,11.29")).toEqual([]);
    expect(parseForecast("{}")).toEqual([undefined]);
    expect(parseForecast('{"model":{"label":"My model"}}')).toEqual([undefined]);
    expect(parseForecast('["47.18,11.29"]')).toEqual([undefined]);
    expect(parseForecast('{"latlong":"0,0"}')).toEqual([undefined]);
    expect(parseForecast('{"model":{"t0":"no date"}}')).toEqual([undefined]);
    expect(parseForecast('{"model":{"labelOffset":{"x":"10"}}}')).toEqual([undefined]);
    expect(warn).toHaveBeenCalledTimes(7);
  });

  test("a model without label needs valid coordinates for the stored label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseForecast('{"model":{"t0":"2026-11-05T12:00:00Z"}}')).toEqual([undefined]);
    expect(parseForecast('{"model":{"labelOffset":{"y":20}}}')).toEqual([undefined]);
    expect(parseForecast('{"model":{"t0":"2026-11-05T12:00:00Z"},"latlong":"0,0"}')).toEqual([
      undefined,
    ]);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  test("the model of a forecast in the SMET file does not depend on the coordinates", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseForecast(JSON.stringify({ model: myModel, latlong: "0,0" }))).toEqual([
      { model: myModel },
    ]);
  });
});

describe("deprecated forecast-latlon attribute", () => {
  test("no forecast", () => {
    expect(parseForecastLatLon(null)).toEqual([]);
    expect(parseForecastLatLon("  ")).toEqual([]);
  });

  test("single value", () => {
    expect(parseForecastLatLon("47.18, 11.29")).toEqual([arome]);
  });

  test("array with one coordinate per station", () => {
    expect(parseForecastLatLon('["47.18,11.29", null, ""]')).toEqual([arome, undefined, undefined]);
  });

  test("objects are not supported", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseForecastLatLon('{"latlong":"47.18,11.29"}')).toEqual([]);
    expect(parseForecastLatLon('[{"latlong":"47.18,11.29"}]')).toEqual([undefined]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test("invalid values are ignored", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(parseForecastLatLon("48.5")).toEqual([]);
    expect(parseForecastLatLon("0,0")).toEqual([]);
  });
});
