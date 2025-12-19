import { z } from "zod/mini";

const number = z.nullish(z.number()).check(z.overwrite((v) => (v === -777 ? undefined : v)));

export const FeaturePropertiesSchema = z.object({
  name: z.string(),
  altitude: z.nullish(z.number()),
  Beobachtungsbeginn: z.nullish(z.string()),
  operator: z.nullish(z.string()),
  operatorLink: z.nullish(z.string()),
  plot: z.nullish(z.string()),
  "LWD-Nummer": z.nullish(z.string()),
  "LWD-Region": z.nullish(z.string()),

  date: z.nullish(z.coerce.date()),
  GS_O: number,
  GS_U: number,
  HS: number,
  HSD24: number,
  HSD48: number,
  HSD72: number,
  LD: number,
  LT_MAX: number,
  LT_MIN: number,
  LT: number,
  N24: number,
  N48: number,
  N6: number,
  N72: number,
  OFT: number,
  RH: number,
  TD: number,
  WG_BOE: number,
  WG: number,
  WR: number,
});

export const FeatureSchema = z.object({
  type: z.enum(["Feature"]),
  geometry: z.union([
    z.tuple([z.number(), z.number()]),
    z.tuple([z.number(), z.number(), z.number()]),
  ]),
  properties: FeaturePropertiesSchema,
});

export const FeatureCollectionSchema = z.object({
  type: z.enum(["FeatureCollection"]),
  features: z.array(FeatureSchema),
  properties: z.any(),
});
