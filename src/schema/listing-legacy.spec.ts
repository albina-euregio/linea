import { z } from "zod";
import { FeatureSchema } from "./listing-legacy";
import { expect, test } from "vitest";

test("parse legacy", () => {
  const feature = FeatureSchema.parse({
    id: "6cb4697c-2e0a-7214-6f8c-9af46ee648f3",
    geometry: {
      coordinates: [11.335489, 47.052267, 2180.0],
      type: "Point",
    },
    properties: {
      Beobachtungsbeginn: "2008",
      GS_O: 45.0,
      HS: 41.6,
      HSD24: -3.7,
      HSD48: -1.38,
      HSD72: -1.88,
      LT: -4.1,
      LT_MAX: -2.0,
      LT_MIN: -4.4,
      "LWD-Nummer": "GGAL2",
      "LWD-Region": "AT-07-22 Stubaier Alpen Mitte",
      OFT: -3.7,
      RH: 98.2,
      TD: -4.341,
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
