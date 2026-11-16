import * as v from "valibot";

const forecastParameterValueSchema = v.object({
  name: v.string(),
  unit: v.string(),
  data: v.array(v.nullable(v.number())),
});

export function createGeosphereForecastSchema<const K extends string>(parameters: readonly K[]) {
  const forecastParametersSchema = v.object(
    Object.fromEntries(
      parameters.map((p) => [p, v.optional(forecastParameterValueSchema)]),
    ) as Record<K, v.OptionalSchema<typeof forecastParameterValueSchema, undefined>>,
  );

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

  return v.object({
    reference_time: v.string(),
    media_type: v.string(),
    type: v.literal("FeatureCollection"),
    version: v.string(),
    timestamps: v.array(v.string()),
    features: v.pipe(v.array(forecastFeatureSchema), v.minLength(1)),
  });
}
