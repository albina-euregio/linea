import { z } from "zod";
import { describe, expect, test, vi } from "vite-plus/test";
import * as geosphere from "./geosphere-data";

describe("geosphere", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: URL) => {
      let json;

      if (url.toString().endsWith("/metadata")) {
        json = {
          title: "TAWES",
          parameters: [],
          frequency: "10min",
          type: "station",
          mode: "historical",
          response_formats: ["geojson", "csv"],
          start_time: "2026-01-12T00:10+00:00",
          end_time: "2026-04-14T10:20+00:00",
          stations: [
            {
              type: "INDIVIDUAL",
              id: "11326",
              name: "SCHMIRN",
              state: "Tirol",
              lat: 47.08722222222222,
              lon: 11.580277777777777,
              altitude: 1464.0,
              valid_from: "2004-10-19T00:00:00",
              valid_to: "2027-04-14T10:21:35",
              has_sunshine: false,
              has_global_radiation: false,
              is_active: true,
            },
          ],
          id_type: "Synop",
        } satisfies z.input<typeof geosphere.MetadataSchema>;
      } else if (url.toString().includes("station_ids=")) {
        json = {
          media_type: "application/json",
          type: "FeatureCollection",
          version: "v1",
          timestamps: [
            "2026-04-07T10:20+00:00",
            "2026-04-07T10:30+00:00",
            "2026-04-07T10:40+00:00",
            "2026-04-07T10:50+00:00",
            "2026-04-07T11:00+00:00",
            "2026-04-07T11:10+00:00",
            "2026-04-07T11:20+00:00",
            "2026-04-07T11:30+00:00",
            "2026-04-07T11:40+00:00",
            "2026-04-07T11:50+00:00",
            "2026-04-07T12:00+00:00",
            "2026-04-07T12:10+00:00",
          ],
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [11.580277777777777, 47.08722222222222] },
              properties: {
                parameters: {
                  TL: {
                    name: "Lufttemperatur",
                    unit: "°C",
                    data: [14.6, 15.0, 15.5, 15.1, 15.4, 15.3, 15.8, 15.5, 15.4, 15.7, 15.9, 16.0],
                  },
                  FF: {
                    name: "Windgeschwindigkeit",
                    unit: "m/s",
                    data: [0.9, 1.2, 0.7, 1.7, 0.6, 3.5, 2.3, 2.3, 1.2, 3.2, 1.0, 0.7],
                  },
                  FFX: {
                    name: "Windspitze",
                    unit: "m/s",
                    data: [5.2, 3.8, 3.1, 4.4, 2.3, 6.3, 5.0, 4.6, 8.5, 9.0, 4.3, 4.1],
                  },
                  DD: {
                    name: "Windrichtung",
                    unit: "°",
                    data: [
                      194.0, 166.0, 329.0, 12.0, 149.0, 38.0, 50.0, 62.0, 138.0, 211.0, 221.0, 66.0,
                    ],
                  },
                  P: {
                    name: "Luftdruck",
                    unit: "hPa",
                    data: [
                      859.5, 859.3, 859.2, 859.2, 859.1, 859.1, 859.0, 859.0, 858.8, 858.8, 858.8,
                      858.9,
                    ],
                  },
                  RF: {
                    name: "Relative Feuchte",
                    unit: "%",
                    data: [25.0, 25.0, 25.0, 24.0, 27.0, 28.0, 27.0, 26.0, 26.0, 28.0, 25.0, 28.0],
                  },
                  SCHNEE: {
                    name: "Schneehöhe",
                    unit: "cm",
                    data: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
                  },
                  TP: {
                    name: "Taupunktstemperatur gemessen",
                    unit: "°C",
                    data: [-5.1, -5.1, -4.3, -5.5, -3.9, -3.4, -3.4, -4.1, -4.2, -2.7, -3.8, -2.8],
                  },
                },
                station: "11326",
              },
            },
          ],
        } satisfies z.input<typeof geosphere.FeatureCollectionSchema>;
      }

      return Promise.resolve(new Response(JSON.stringify(json)));
    }),
  );

  test("parseGeosphereData", async () => {
    const { features } = await new geosphere.GeoSphereDataProvider().fetchStationListing();
    const feature = features[0];
    const data = await new geosphere.GeoSphereDataProvider().fetchStationData(
      feature,
      new URL(feature.properties.dataURLs[0]),
    );
    expect(data).toMatchSnapshot();
  });

  test("parseGeosphereFeature", async () => {
    const { features } = await new geosphere.GeoSphereDataProvider().fetchStationListing();
    const feature = features[0];
    delete feature.properties.dataURLs;
    expect(feature).toMatchSnapshot();
  });
});
