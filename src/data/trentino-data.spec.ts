import { expect, test, vi } from "vite-plus/test";
import "temporal-polyfill/global";
import { PROVIDERS } from "./providers";
import * as trentino from "./trentino-data";

test("Meteotrentino station listing", async () => {
  const geojson = `{
"type": "FeatureCollection",
"features":[
{"type": "Feature",
"properties": {"codice": "T0154","nome": "Ala (Convento)","quota":"165","inizio":"1921-01-01","fine":"2005-06-22","maxprecfile":"T0405.xlsx","weblevel":"-1"},
"geometry": {"type": "Point","coordinates": [10.99987083,45.75711703]}
},
{"type": "Feature",
"properties": {"codice": "T0405","nome": "Ala (Maso Le Pozze)","quota":"170","inizio":"2012-05-17","fine":"","maxprecfile":"T0405.xlsx","weblevel":"5"},
"geometry": {"type": "Point","coordinates": [11.023828,45.786137]}
},
{"type": "Feature",
"properties": {"codice": "T0153","nome": "Ala (Ronchi)","quota":"692","inizio":"1927-08-01","fine":"","maxprecfile":"T0153.xlsx","weblevel":"30"},
"geometry": {"type": "Point","coordinates": [11.06545,45.73919]}
},
{"type": "Feature",
"properties": {"codice": null,"nome": "Broken","quota":"100","inizio":"","fine":"","maxprecfile":"","weblevel":"0"},
"geometry": {"type": "Point","coordinates": [11.0,46.0]}
}
]
}`;

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url === trentino.URL) {
        return Promise.resolve(new Response(geojson));
      }
      throw new Error(`Unsupported URL ${url}`);
    }),
  );

  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { features } = await PROVIDERS.filtered(
    (c) => c.dataProviderID === "IT-32-TN",
  ).fetchStationListing();
  expect(features.map((f) => f.id)).toEqual(["T0405", "T0153"]);
  expect(warn).toHaveBeenCalledOnce();
  expect(warn.mock.calls[0][0]).toBe("Skipping invalid Meteotrentino station");
  warn.mockRestore();
  expect(features[0].properties).toMatchObject({
    name: "Ala (Maso Le Pozze)",
    shortName: "T0405",
    altitude: 170,
    startYear: "2012",
    dataProviderID: "IT-32-TN",
    dataURLs: [
      "https://dati.meteotrentino.it/Service.asmx/GetSmetData?stazione=T0405&token=Euregio2026",
    ],
  });
  expect(features).toMatchSnapshot();
});
