import { expect, test } from "vitest";
import { parseSMET } from "./smet-data";

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

  expect(parseSMET(smet, parseFloat("inf"))).toMatchSnapshot();
});

test("parse AT-02", async () => {
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
  expect(parseSMET(smet, parseFloat("inf"))).toMatchSnapshot();
});
