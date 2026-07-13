import * as v from "valibot";

const isoDateSchema = v.pipe(
  v.string(),
  v.check((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  }, "Expected ISO date string (YYYY-MM-DD)"),
);

const isoDateTimeSchema = v.pipe(
  v.string(),
  v.check((value) => !Number.isNaN(Date.parse(value)), "Expected ISO date-time string"),
);

export const stressItemSchema = v.strictObject({
  date: isoDateSchema,
  stressLevel: v.pipe(v.number(), v.integer()),
  lastUpdated: isoDateTimeSchema,
});

export const stressDataSchema = v.record(v.string(), v.array(stressItemSchema));

export type StressLevelItem = v.InferOutput<typeof stressItemSchema>;
export type StressLevelData = v.InferOutput<typeof stressDataSchema>;
