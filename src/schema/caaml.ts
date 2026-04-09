import { z } from "zod";

const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Expected ISO date-time string",
});

const languageCodeSchema = z.string().length(2);

const validTimeSchema = z
  .object({
    startTime: isoDateTime.optional(),
    endTime: isoDateTime.optional(),
  })
  .strict();

const validTimePeriodSchema = z.enum(["all_day", "earlier", "later"]);

const dangerRatingValueSchema = z.enum([
  "low",
  "moderate",
  "considerable",
  "high",
  "very_high",
  "no_snow",
  "no_rating",
]);

const avalancheProblemTypeSchema = z.enum([
  "new_snow",
  "wind_slab",
  "persistent_weak_layers",
  "wet_snow",
  "gliding_snow",
  "cornices",
  "no_distinct_avalanche_problem",
  "favourable_situation",
]);
export type AvalancheProblemType = z.infer<typeof avalancheProblemTypeSchema>;

const snowpackStabilitySchema = z.enum(["good", "fair", "poor", "very_poor"]);

const frequencySchema = z.enum(["none", "few", "some", "many"]);

const aspectsSchema = z.array(z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "n/a"]));

const elevationSchema = z
  .object({
    lowerBound: z
      .string()
      .regex(/^(treeline|0|[1-9][0-9]*[0][0]+)$/)
      .optional(),
    upperBound: z
      .string()
      .regex(/^(treeline|0|[1-9][0-9]*[0][0]+)$/)
      .optional(),
  })
  .strict();

const extFileSchema = z
  .object({
    fileType: z.string().optional(),
    description: z.string().optional(),
    fileReferenceURI: z.string().url().optional(),
  })
  .strict();

const metaDataSchema = z
  .object({
    extFiles: z.array(extFileSchema).optional(),
    comment: z.string().optional(),
  })
  .strict();

const customDataSchema = z.looseObject({
  LWD_Tyrol: z
    .object({
      dangerPatterns: z.array(z.string()).optional(),
    })
    .optional(),
});

const personSchema = z
  .object({
    name: z.string().optional(),
    website: z.string().url().optional(),
    metaData: metaDataSchema.optional(),
    customData: customDataSchema.optional(),
  })
  .strict();

const providerSchema = z
  .object({
    name: z.string().optional(),
    website: z.string().url().optional(),
    contactPerson: personSchema.optional(),
    metaData: metaDataSchema.optional(),
    customData: customDataSchema.optional(),
  })
  .strict();

const sourceSchema = z
  .object({
    provider: providerSchema.optional(),
    person: personSchema.optional(),
  })
  .strict()
  .refine((value) => Boolean(value.provider || value.person), {
    message: "source requires either provider or person",
  });

const regionSchema = z
  .object({
    regionID: z.string(),
    name: z.string().optional(),
    metaData: metaDataSchema.optional(),
    customData: customDataSchema.optional(),
  })
  .strict();

const textsSchema = z
  .object({
    highlights: z.string().optional(),
    comment: z.string().optional(),
  })
  .strict();

const tendencySchema = z
  .object({
    tendencyType: z.enum(["decreasing", "steady", "increasing"]).optional(),
    validTime: validTimeSchema.optional(),
    metaData: metaDataSchema.optional(),
    customData: customDataSchema.optional(),
  })
  .strict();

const tendencyEntrySchema = z.union([
  textsSchema,
  tendencySchema,
  z
    .object({
      highlights: z.string().optional(),
      comment: z.string().optional(),
      tendencyType: z.enum(["decreasing", "steady", "increasing"]).optional(),
      validTime: validTimeSchema.optional(),
      metaData: metaDataSchema.optional(),
      customData: customDataSchema.optional(),
    })
    .strict(),
]);

const dangerRatingSchema = z
  .object({
    mainValue: dangerRatingValueSchema,
    elevation: elevationSchema.optional(),
    aspects: aspectsSchema.optional(),
    validTimePeriod: validTimePeriodSchema.optional(),
    metaData: metaDataSchema.optional(),
    customData: customDataSchema.optional(),
  })
  .strict();

const avalancheProblemSchema = z
  .object({
    problemType: avalancheProblemTypeSchema,
    comment: z.string().optional(),
    avalancheSize: z.number().min(1).max(5).optional(),
    snowpackStability: snowpackStabilitySchema.optional(),
    frequency: frequencySchema.optional(),
    dangerRatingValue: dangerRatingValueSchema.optional(),
    elevation: elevationSchema.optional(),
    aspects: aspectsSchema.optional(),
    validTimePeriod: validTimePeriodSchema.optional(),
    metaData: metaDataSchema.optional(),
    customData: customDataSchema.optional(),
  })
  .strict();

export const bulletinSchema = z
  .object({
    bulletinID: z.string().optional(),
    lang: languageCodeSchema.optional(),
    publicationTime: isoDateTime.optional(),
    validTime: validTimeSchema.optional(),
    nextUpdate: isoDateTime.optional(),
    unscheduled: z.boolean().optional(),
    source: sourceSchema.optional(),
    regions: z.array(regionSchema).optional(),
    dangerRatings: z.array(dangerRatingSchema).optional(),
    avalancheProblems: z.array(avalancheProblemSchema).optional(),
    highlights: z.string().optional(),
    weatherForecast: textsSchema.optional(),
    weatherReview: textsSchema.optional(),
    avalancheActivity: textsSchema.optional(),
    snowpackStructure: textsSchema.optional(),
    travelAdvisory: textsSchema.optional(),
    tendency: z.array(tendencyEntrySchema).optional(),
    metaData: metaDataSchema.optional(),
    customData: customDataSchema.optional(),
  })
  .strict();

export const bulletinCollectionSchema = z
  .object({
    bulletins: z.array(bulletinSchema),
    metaData: metaDataSchema.optional(),
    customData: customDataSchema.optional(),
  })
  .strict();

export type Bulletin = z.infer<typeof bulletinSchema>;
export type BulletinCollection = z.infer<typeof bulletinCollectionSchema>;
