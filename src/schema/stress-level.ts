import { z } from "zod";

const isoDateSchema = z.string().refine(
  (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  },
  {
    message: "Expected ISO date string (YYYY-MM-DD)",
  },
);

const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Expected ISO date-time string",
});

export const stressItemSchema = z
  .object({
    date: isoDateSchema,
    stressLevel: z.int(),
    lastUpdated: isoDateTimeSchema,
  })
  .strict();

export const stressDataSchema = z.record(z.string(), z.array(stressItemSchema));

export type StressLevelItem = z.infer<typeof stressItemSchema>;
export type StressLevelData = z.infer<typeof stressDataSchema>;
