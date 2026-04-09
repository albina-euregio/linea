import { expect, test, vi } from "vite-plus/test";
import { fetchSMET } from "./smet-data";

function mockFetch(text: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(text, { headers: { "Content-Type": "text/plain" } }))),
  );
}

test("parse AT-07", async () => {
  const smet = `
SMET 1.1 ASCII
[HEADER]
station_id = GGAL2
station_name = Gallreideschrofen
latitude = 47.052267
longitude = 11.335489
altitude = 2180.0
source = LWD Tirol
nodata = -777
creation = 2025-12-03T19:38:35.851532100Z
fields = timestamp ISWR HS LF TA TD TS.000 TS.020 TS.040 TS.060 TSS
#parameters = timestamp GS HS LF LT TP TS.000 TS.020 TS.040 TS.060 T0
#units = ISO8601 W/m² m % K K °C °C °C °C K
[DATA]
2025-11-26T19:40:00Z 1 0.338146 97.9 263.85 263.58109289 -777 -99.9 -99.9 -99.9 264.35
2025-11-26T19:50:00Z 1 0.338045 97.9 263.95 263.680857094 -777 -99.9 -99.9 -99.9 264.35
2025-11-26T20:00:00Z 1 0.339723 97.9 263.95 263.680857094 -777 -99.9 -99.9 -99.9 264.35
2025-11-26T20:10:00Z 1 0.341 97.8 263.85 263.56816033 -777 -99.9 -99.9 -99.9 264.15
`;
  mockFetch(smet);
  expect(await fetchSMET("https://example.com/test.smet")).toMatchSnapshot();
});

test("parse AT-02 (with tz = 1: UTC+1)", async () => {
  const smet = `
[HEADER]
station_id = 2900250
station_name = mallnitz_ankogel_hintere_lucke
latitude = 47.0374000
longitude = 13.2027000
altitude = 2317.0000
nodata = -777
fields = timestamp\tTA\tRH\tHS
tz = 1

[DATA]
2025-11-26T18:50:00\t266.05\t0.935\t34.5
2025-11-26T19:00:00\t266.05\t0.934\t34.2
2025-11-26T19:10:00\t265.95\t0.939\t34.1
2025-11-26T19:20:00\t265.95\t0.947\t34
`;
  mockFetch(smet);
  expect(await fetchSMET("https://example.com/test.smet")).toMatchSnapshot();
});

test("parse AT-02 (assume tz = 0: UTC)", async () => {
  const smet = `
[HEADER]
station_id = 2900250
station_name = mallnitz_ankogel_hintere_lucke
latitude = 47.0374000
longitude = 13.2027000
altitude = 2317.0000
nodata = -777
fields = timestamp\tTA\tRH\tHS

[DATA]
2025-11-26T18:50:00\t266.05\t0.935\t34.5
2025-11-26T19:00:00\t266.05\t0.934\t34.2
2025-11-26T19:10:00\t265.95\t0.939\t34.1
2025-11-26T19:20:00\t265.95\t0.947\t34
`;
  mockFetch(smet);
  expect(await fetchSMET("https://example.com/test.smet")).toMatchSnapshot();
});

test("parse AT-02 (2025-12-09)", async () => {
  const smet = `
[HEADER]
station_id       = 2900250
station_name     = mallnitz_ankogel_hintere_lucke
latitude         = 47.037400
longitude        = 13.202700
altitude         = 2317.0
easting          = 363456.169014
northing         = 5210887.725522
epsg             = 32633
nodata           = -999
tz               = 0
fields           = timestamp HS RH TA
[DATA]
2025-12-02T16:30:00   37.600   0.909   272.75
2025-12-02T17:30:00   37.800    -999   272.35
2025-12-02T18:30:00   37.800    -999   272.05
2025-12-02T19:30:00   38.000    -999   272.15
2025-12-02T20:30:00   38.000   0.941   272.25
2025-12-02T21:30:00   37.800    -999   271.95
`;
  mockFetch(smet);
  expect(await fetchSMET("https://example.com/test.smet")).toMatchSnapshot();
});
