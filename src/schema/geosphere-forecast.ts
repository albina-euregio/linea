import * as v from "valibot";

const forecastParameterValueSchema = v.object({
  name: v.string(),
  unit: v.string(),
  data: v.array(v.nullable(v.number())),
});

const forecastParametersSchema = v.object({
  t2m: v.optional(forecastParameterValueSchema),
  u10m: v.optional(forecastParameterValueSchema),
  ugust: v.optional(forecastParameterValueSchema),
  v10m: v.optional(forecastParameterValueSchema),
  vgust: v.optional(forecastParameterValueSchema),
  rh2m: v.optional(forecastParameterValueSchema),
  rr_acc: v.optional(forecastParameterValueSchema),
  snow_acc: v.optional(forecastParameterValueSchema),
  grad: v.optional(forecastParameterValueSchema),
});

const forecastFeatureSchema = v.object({
  type: v.literal("Feature"),
  geometry: v.object({
    type: v.literal("Point"),
    coordinates: v.tuple([v.number(), v.number()]),
  }),
  properties: v.object({
    parameters: forecastParametersSchema,
  }),
});

export const GeosphereForecastSchema = v.object({
  reference_time: v.string(),
  media_type: v.string(),
  type: v.literal("FeatureCollection"),
  version: v.string(),
  timestamps: v.array(v.string()),
  features: v.pipe(v.array(forecastFeatureSchema), v.minLength(1)),
});

export type GeosphereForecast = v.InferOutput<typeof GeosphereForecastSchema>;
