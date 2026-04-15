import { z } from "zod";
import { FeatureSchema } from "./listing";
import { expect, test } from "vite-plus/test";

test("parse legacy", () => {
  const feature = FeatureSchema.parse({
    id: "6cb4697c-2e0a-7214-6f8c-9af46ee648f3",
    geometry: {
      coordinates: [11.335489, 47.052267, 2180.0],
      type: "Point",
    },
    properties: {
      startYear: "2008",
      ISWR: 45.0,
      HS: 41.6 / 100,
      HSD_24: -3.7 / 100,
      HSD_48: -1.38 / 100,
      HSD_72: -1.88 / 100,
      TA: 273.15 + -4.1,
      TA_MAX: 273.15 + -2.0,
      TA_MIN: 273.15 + -4.4,
      shortName: "GGAL2",
      microRegionID: "AT-07-22 Stubaier Alpen Mitte",
      TSS: 273.15 + -3.7,
      RH: 98.2 / 100,
      TD: 273.15 + -4.341,
      date: "2026-01-25T09:20:00+01:00",
      name: "Gallreideschrofen",
      operator: "LWD Tirol",
      operatorLink: "https://lawine.tirol.gv.at/",
      plot: "gallreideschrofen",
    },
    type: "Feature",
  } satisfies z.input<typeof FeatureSchema>);
  expect(feature).toMatchSnapshot();
});
