import { z } from "zod";

const forecastParameterValueSchema = z.object({
  name: z.string(),
  unit: z.string(),
  data: z.array(z.number().nullable()),
});

const forecastParametersSchema = z.object({
  t2m: forecastParameterValueSchema.optional(),
  u10m: forecastParameterValueSchema.optional(),
  ugust: forecastParameterValueSchema.optional(),
  v10m: forecastParameterValueSchema.optional(),
  vgust: forecastParameterValueSchema.optional(),
  rh2m: forecastParameterValueSchema.optional(),
  rr_acc: forecastParameterValueSchema.optional(),
  grad: forecastParameterValueSchema.optional(),
});

const forecastFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  properties: z.object({
    parameters: forecastParametersSchema,
  }),
});

export const GeosphereForecastSchema = z.object({
  reference_time: z.string(),
  media_type: z.string(),
  type: z.literal("FeatureCollection"),
  version: z.string(),
  timestamps: z.array(z.string()),
  features: z.array(forecastFeatureSchema).min(1),
});

export type GeosphereForecast = z.infer<typeof GeosphereForecastSchema>;
