import { z } from "zod";
import { expect, test } from "vite-plus/test";
import {
  mapSLFStationToFeature,
  parseSLFAPIData,
  SLFStationDataSchema,
  SLFStationMetadataSchema,
} from "./slf-data";

test("parseSLFAPIData", () => {
  const metadata = SLFStationMetadataSchema.parse({
    code: "SLF1",
    label: "SCHMIRN",
    elevation: 1464,
    lon: 11.58,
    lat: 47.08,
    country_code: "CH",
    canton_code: "VS",
    type: "station",
  } satisfies z.input<typeof SLFStationMetadataSchema>);

  const collection = [
    {
      station_code: "SLF1",
      measure_date: "2026-04-14T10:00:00Z",
      HS: 120,
      TA_30MIN_MEAN: 273.15,
      RH_30MIN_MEAN: 0.5,
      TSS_30MIN_MEAN: 271.15,
      VW_30MIN_MEAN: 3,
      VW_30MIN_MAX: 5,
      DW_30MIN_MEAN: 180,
    },
    {
      station_code: "SLF1",
      measure_date: "2026-04-14T10:10:00Z",
      HS: 122,
      TA_30MIN_MEAN: 272.15,
      RH_30MIN_MEAN: 0.55,
      TSS_30MIN_MEAN: 270.15,
      VW_30MIN_MEAN: 4,
      VW_30MIN_MAX: 6,
      DW_30MIN_MEAN: 190,
    },
  ] satisfies z.input<typeof SLFStationDataSchema>[];

  const data = parseSLFAPIData([metadata], SLFStationDataSchema.array().parse(collection));

  expect(data).toMatchSnapshot();
});

test("mapSLFStationToFeature", () => {
  const station = SLFStationMetadataSchema.parse({
    code: "SLF1",
    label: "SCHMIRN",
    elevation: 1464,
    lon: 11.58,
    lat: 47.08,
  } satisfies z.input<typeof SLFStationMetadataSchema>);

  const feature = mapSLFStationToFeature(
    station,
    {},
    {
      SLF1: { timestamp: "2026-04-14T10:00:00Z", value: 10.0 },
    },
    {},
    {
      SLF1: { timestamp: "2026-04-14T10:00:00Z", value: [18, 180] },
    },
  );
  expect(feature).toMatchSnapshot();
});
