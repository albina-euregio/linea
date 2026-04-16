import { expect, test, vi } from "vite-plus/test";
import { PROVIDERS } from "./providers";
import * as slf from "./slf-data";

test("SLF", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL) => {
      let json = {};
      switch (url.toString()) {
        case slf.URL.STATIONS:
          json = [
            {
              code: "KES2",
              label: "Porta d'Es-cha",
              lon: 9.8981393038,
              lat: 46.6212841261,
              elevation: 2727.0,
              country_code: "CH",
              canton_code: "GR",
              type: "SNOW_FLAT",
            },
          ];
          break;
        case slf.URL.SNOW_HEIGHT:
          json = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [9.8981393038, 46.6212841261, 2727] },
                properties: {
                  network: "IMIS",
                  code: "KES2",
                  elevation: 2727,
                  label: "Porta d'Es-cha",
                  type: "SNOW_FLAT",
                  manual: false,
                  value: 130.504,
                  timestamp: "2026-04-14T16:30:00Z",
                  fill: "#0670b0",
                },
              },
            ],
          };
          break;
        case slf.URL.TEMPERATURE_AIR:
          json = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [9.8981393038, 46.6212841261, 2727] },
                properties: {
                  network: "IMIS",
                  code: "KES2",
                  elevation: 2727,
                  label: "Porta d'Es-cha",
                  type: "SNOW_FLAT",
                  manual: false,
                  value: -1.295,
                  timestamp: "2026-04-14T16:30:00Z",
                  fill: "#b7d0ed",
                },
              },
            ],
          };
          break;
        case slf.URL.TEMPERATURE_SNOW_SURFACE:
          json = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [9.8981393038, 46.6212841261, 2727] },
                properties: {
                  network: "IMIS",
                  code: "KES2",
                  elevation: 2727,
                  label: "Porta d'Es-cha",
                  type: "SNOW_FLAT",
                  manual: false,
                  value: -1.022,
                  timestamp: "2026-04-14T16:30:00Z",
                  fill: "#b7d0ed",
                },
              },
            ],
          };
          break;
        case slf.URL.WIND_MEAN:
          json = {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: [9.8981393038, 46.6212841261, 2727] },
                properties: {
                  network: "IMIS",
                  code: "KES2",
                  elevation: 2727,
                  label: "Porta d'Es-cha",
                  type: "SNOW_FLAT",
                  manual: false,
                  velocity: 11.574,
                  direction: 337.3,
                  timestamp: "2026-04-14T16:30:00Z",
                  fill: "#33cb33",
                },
              },
            ],
          };
          break;
        default:
          throw new Error(`Unsupported URL ${url}`);
      }
      return Promise.resolve(new Response(JSON.stringify(json)));
    }),
  );

  const { features } = await PROVIDERS.filtered(
    "",
    (c) => c instanceof slf.SLFDataProvider,
  ).fetchStationListing();
  expect(features).toMatchSnapshot();
});
