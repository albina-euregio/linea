import * as v from "valibot";

const isoDateTime = v.pipe(
  v.string(),
  v.check((value) => !Number.isNaN(Date.parse(value)), "Expected ISO date-time string"),
);

const languageCodeSchema = v.pipe(v.string(), v.length(2));

const validTimeSchema = v.strictObject({
  startTime: v.optional(isoDateTime),
  endTime: v.optional(isoDateTime),
});

const validTimePeriodSchema = v.picklist(["all_day", "earlier", "later"]);

const dangerRatingValueSchema = v.picklist([
  "low",
  "moderate",
  "considerable",
  "high",
  "very_high",
  "no_snow",
  "no_rating",
]);

const avalancheProblemTypeSchema = v.picklist([
  "new_snow",
  "wind_slab",
  "persistent_weak_layers",
  "wet_snow",
  "gliding_snow",
  "cornices",
  "no_distinct_avalanche_problem",
  "favourable_situation",
]);
export type AvalancheProblemType = v.InferOutput<typeof avalancheProblemTypeSchema>;

const snowpackStabilitySchema = v.picklist(["good", "fair", "poor", "very_poor"]);

const frequencySchema = v.picklist(["none", "few", "some", "many"]);

const aspectsSchema = v.array(v.picklist(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "n/a"]));

const elevationSchema = v.strictObject({
  lowerBound: v.optional(v.pipe(v.string(), v.regex(/^(treeline|0|[1-9][0-9]*[0][0]+)$/))),
  upperBound: v.optional(v.pipe(v.string(), v.regex(/^(treeline|0|[1-9][0-9]*[0][0]+)$/))),
});

const extFileSchema = v.strictObject({
  fileType: v.optional(v.string()),
  description: v.optional(v.string()),
  fileReferenceURI: v.optional(v.pipe(v.string(), v.url())),
});

const metaDataSchema = v.strictObject({
  extFiles: v.optional(v.array(extFileSchema)),
  comment: v.optional(v.string()),
});

const customDataSchema = v.looseObject({
  LWD_Tyrol: v.optional(
    v.object({
      dangerPatterns: v.optional(v.array(v.string())),
    }),
  ),
});

const personSchema = v.strictObject({
  name: v.optional(v.string()),
  website: v.optional(v.pipe(v.string(), v.url())),
  metaData: v.optional(metaDataSchema),
  customData: v.optional(customDataSchema),
});

const providerSchema = v.strictObject({
  name: v.optional(v.string()),
  website: v.optional(v.pipe(v.string(), v.url())),
  contactPerson: v.optional(personSchema),
  metaData: v.optional(metaDataSchema),
  customData: v.optional(customDataSchema),
});

const sourceSchema = v.pipe(
  v.strictObject({
    provider: v.optional(providerSchema),
    person: v.optional(personSchema),
  }),
  v.check(
    (value) => Boolean(value.provider || value.person),
    "source requires either provider or person",
  ),
);

const regionSchema = v.strictObject({
  regionID: v.string(),
  name: v.optional(v.string()),
  metaData: v.optional(metaDataSchema),
  customData: v.optional(customDataSchema),
});

const textsSchema = v.strictObject({
  highlights: v.optional(v.string()),
  comment: v.optional(v.string()),
});

const tendencySchema = v.strictObject({
  tendencyType: v.optional(v.picklist(["decreasing", "steady", "increasing"])),
  validTime: v.optional(validTimeSchema),
  metaData: v.optional(metaDataSchema),
  customData: v.optional(customDataSchema),
});

const tendencyEntrySchema = v.union([
  textsSchema,
  tendencySchema,
  v.strictObject({
    highlights: v.optional(v.string()),
    comment: v.optional(v.string()),
    tendencyType: v.optional(v.picklist(["decreasing", "steady", "increasing"])),
    validTime: v.optional(validTimeSchema),
    metaData: v.optional(metaDataSchema),
    customData: v.optional(customDataSchema),
  }),
]);

const dangerRatingSchema = v.strictObject({
  mainValue: dangerRatingValueSchema,
  elevation: v.optional(elevationSchema),
  aspects: v.optional(aspectsSchema),
  validTimePeriod: v.optional(validTimePeriodSchema),
  metaData: v.optional(metaDataSchema),
  customData: v.optional(customDataSchema),
});

const avalancheProblemSchema = v.strictObject({
  problemType: avalancheProblemTypeSchema,
  comment: v.optional(v.string()),
  avalancheSize: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(5))),
  snowpackStability: v.optional(snowpackStabilitySchema),
  frequency: v.optional(frequencySchema),
  dangerRatingValue: v.optional(dangerRatingValueSchema),
  elevation: v.optional(elevationSchema),
  aspects: v.optional(aspectsSchema),
  validTimePeriod: v.optional(validTimePeriodSchema),
  metaData: v.optional(metaDataSchema),
  customData: v.optional(customDataSchema),
});

export const bulletinSchema = v.strictObject({
  bulletinID: v.optional(v.string()),
  lang: v.optional(languageCodeSchema),
  publicationTime: v.optional(isoDateTime),
  validTime: v.optional(validTimeSchema),
  nextUpdate: v.optional(isoDateTime),
  unscheduled: v.optional(v.boolean()),
  source: v.optional(sourceSchema),
  regions: v.optional(v.array(regionSchema)),
  dangerRatings: v.optional(v.array(dangerRatingSchema)),
  avalancheProblems: v.optional(v.array(avalancheProblemSchema)),
  highlights: v.optional(v.string()),
  weatherForecast: v.optional(textsSchema),
  weatherReview: v.optional(textsSchema),
  avalancheActivity: v.optional(textsSchema),
  snowpackStructure: v.optional(textsSchema),
  travelAdvisory: v.optional(textsSchema),
  tendency: v.optional(v.array(tendencyEntrySchema)),
  metaData: v.optional(metaDataSchema),
  customData: v.optional(customDataSchema),
});

export const bulletinCollectionSchema = v.strictObject({
  bulletins: v.array(bulletinSchema),
  metaData: v.optional(metaDataSchema),
  customData: v.optional(customDataSchema),
});

export type Bulletin = v.InferOutput<typeof bulletinSchema>;
export type BulletinCollection = v.InferOutput<typeof bulletinCollectionSchema>;
