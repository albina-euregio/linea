import * as v from "valibot";

// ============================================================================
// Enum Schemas
// ============================================================================

export const dangerSourceVariantStatusSchema = v.picklist(["active", "dormant", "inactive"]);
export type DangerSourceVariantStatus = v.InferOutput<typeof dangerSourceVariantStatusSchema>;

export const dangerSourceVariantTypeSchema = v.picklist(["forecast", "analysis"]);
export type DangerSourceVariantType = v.InferOutput<typeof dangerSourceVariantTypeSchema>;

export const avalancheTypeSchema = v.picklist(["slab", "loose", "glide"]);
export type AvalancheType = v.InferOutput<typeof avalancheTypeSchema>;

export const cardinalDirectionSchema = v.picklist(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);
export type CardinalDirection = v.InferOutput<typeof cardinalDirectionSchema>;

export const dangerPeakSchema = v.picklist([
  "evening",
  "first_night_half",
  "second_night_half",
  "morning",
  "forenoon",
  "afternoon",
]);
export type DangerPeak = v.InferOutput<typeof dangerPeakSchema>;

export const slopeGradientSchema = v.picklist([
  "moderately_steep",
  "steep",
  "very_steep",
  "extremely_steep",
]);
export type SlopeGradient = v.InferOutput<typeof slopeGradientSchema>;

export const naturalReleaseSchema = v.picklist(["likely", "possible", "unlikely"]);
export type NaturalRelease = v.InferOutput<typeof naturalReleaseSchema>;

export const dangerSignSchema = v.picklist([
  "shooting_cracks",
  "whumpfing",
  "fresh_avalanches",
  "glide_cracks",
]);
export type DangerSign = v.InferOutput<typeof dangerSignSchema>;

export const dangerRatingSchema = v.picklist([
  "missing",
  "no_snow",
  "no_rating",
  "low",
  "moderate",
  "considerable",
  "high",
  "very_high",
]);
export type DangerRating = v.InferOutput<typeof dangerRatingSchema>;

export const dangerRatingModificatorSchema = v.picklist(["minus", "equal", "plus"]);
export type DangerRatingModificator = v.InferOutput<typeof dangerRatingModificatorSchema>;

export const avalancheSizeSchema = v.picklist([
  "small",
  "medium",
  "large",
  "very_large",
  "extreme",
]);
export type AvalancheSize = v.InferOutput<typeof avalancheSizeSchema>;

export const snowpackStabilitySchema = v.picklist(["good", "fair", "poor", "very_poor"]);
export type SnowpackStability = v.InferOutput<typeof snowpackStabilitySchema>;

export const frequencySchema = v.picklist(["none", "few", "some", "many"]);
export type Frequency = v.InferOutput<typeof frequencySchema>;

export const glidingSnowActivitySchema = v.picklist(["low", "medium", "high"]);
export type GlidingSnowActivity = v.InferOutput<typeof glidingSnowActivitySchema>;

export const grainShapeSchema = v.picklist([
  "PP",
  "MM",
  "DF",
  "RG",
  "FC",
  "DH",
  "SH",
  "MF",
  "IF",
  "PPco",
  "PPnd",
  "PPpl",
  "PPsd",
  "PPir",
  "PPgp",
  "PPhl",
  "PPip",
  "PPrm",
  "MMrp",
  "MMci",
  "DFdc",
  "DFbk",
  "RGsr",
  "RGlr",
  "RGwp",
  "RGxf",
  "FCso",
  "FCsf",
  "FCxr",
  "DHcp",
  "DHpr",
  "DHch",
  "DHla",
  "DHxr",
  "SHsu",
  "SHcv",
  "SHxr",
  "MFcl",
  "MFpc",
  "MFsl",
  "MFcr",
  "IFil",
  "IFic",
  "IFbi",
  "IFrc",
  "IFsc",
]);
export type GrainShape = v.InferOutput<typeof grainShapeSchema>;

export const handHardnessSchema = v.picklist([
  "fist",
  "four_fingers",
  "one_finger",
  "pencil",
  "knife",
  "ice",
]);
export type HandHardness = v.InferOutput<typeof handHardnessSchema>;

export const hardnessProfileSchema = v.picklist(["decreasing", "steady", "increasing"]);
export type HardnessProfile = v.InferOutput<typeof hardnessProfileSchema>;

export const energyTransferPotentialSchema = v.picklist(["low", "medium", "high", "very_high"]);
export type EnergyTransferPotential = v.InferOutput<typeof energyTransferPotentialSchema>;

export const distributionTypeSchema = v.picklist(["isolated", "specific", "widespread"]);
export type DistributionType = v.InferOutput<typeof distributionTypeSchema>;

export const weakLayerThicknessSchema = v.picklist(["thick", "thin"]);
export type WeakLayerThickness = v.InferOutput<typeof weakLayerThicknessSchema>;

export const weakLayerStrengthSchema = v.picklist(["low", "medium", "high", "very_high"]);
export type WeakLayerStrength = v.InferOutput<typeof weakLayerStrengthSchema>;

export const crustPresenceSchema = v.picklist(["no", "partly", "yes"]);
export type CrustPresence = v.InferOutput<typeof crustPresenceSchema>;

export const weakLayerPositionSchema = v.picklist(["upper", "middle", "lower", "ground"]);
export type WeakLayerPosition = v.InferOutput<typeof weakLayerPositionSchema>;

export const weakLayerCreationSchema = v.picklist([
  "radiation_recrystallization",
  "diurnal_recrystallization",
  "melt_layer_recrystallization",
  "surface_hoar_formation",
]);
export type WeakLayerCreation = v.InferOutput<typeof weakLayerCreationSchema>;

export const dangerSpotRecognizabilitySchema = v.picklist([
  "very_easy",
  "easy",
  "hard",
  "very_hard",
]);
export type DangerSpotRecognizability = v.InferOutput<typeof dangerSpotRecognizabilitySchema>;

export const remoteTriggeringSchema = v.picklist(["likely", "possible", "unlikely"]);
export type RemoteTriggering = v.InferOutput<typeof remoteTriggeringSchema>;

export const terrainTypeSchema = v.picklist([
  "gullies_and_bowls",
  "adjacent_to_ridgelines",
  "distant_from_ridgelines",
  "in_the_vicinity_of_peaks",
  "pass_areas",
  "shady_slopes",
  "sunny_slopes",
  "grassy_slopes",
  "cut_slopes",
  "wind_loaded_slopes",
  "base_of_rock_walls",
  "behind_abrupt_changes_in_the_terrain",
  "transitions_into_gullies_and_bowls",
  "areas_where_the_snow_cover_is_rather_shallow",
  "transitions_from_a_shallow_to_a_deep_snowpack",
  "highly_frequented_off_piste_terrain",
  "little_used_backcountry_terrain",
  "places_that_are_protected_from_the_wind",
  "regions_exposed_to_the_foehn_wind",
  "regions_with_a_lot_of_snow",
  "regions_exposed_to_precipitation",
  "regions_exposed_to_heavier_precipitation",
]);
export type TerrainType = v.InferOutput<typeof terrainTypeSchema>;

export const moistureSchema = v.picklist(["wet", "moist", "dry"]);
export type Moisture = v.InferOutput<typeof moistureSchema>;

// ============================================================================
// Object Schemas
// ============================================================================

const dangerSourceSchema = v.object({
  id: v.nullable(v.string()),
  ownerRegion: v.string(),
  creationDate: v.pipe(v.unknown(), v.toDate()),
  title: v.string(),
  description: v.optional(v.string()),
});

export type DangerSource = v.InferOutput<typeof dangerSourceSchema>;

const eawsMatrixInformationSchema = v.object({
  dangerRating: v.optional(dangerRatingSchema),
  dangerRatingModificator: v.optional(dangerRatingModificatorSchema),
  avalancheSize: v.optional(avalancheSizeSchema),
  snowpackStability: v.optional(snowpackStabilitySchema),
  frequency: v.optional(frequencySchema),
  avalancheSizeValue: v.optional(v.number()),
  snowpackStabilityValue: v.optional(v.number()),
  frequencyValue: v.optional(v.number()),
});

export type EAWSMatrixInformation = v.InferOutput<typeof eawsMatrixInformationSchema>;

export const dangerSourceVariantSchema = v.looseObject({
  id: v.optional(v.nullable(v.string())),
  originalDangerSourceVariantId: v.optional(v.string()),
  forecastDangerSourceVariantId: v.optional(v.string()),
  dangerSource: v.optional(v.nullable(dangerSourceSchema)),
  title: v.optional(v.string()),
  creationDate: v.optional(v.pipe(v.unknown(), v.toDate())),
  updateDate: v.optional(v.pipe(v.unknown(), v.toDate())),
  validFrom: v.optional(v.pipe(v.unknown(), v.toDate())),
  validUntil: v.optional(v.pipe(v.unknown(), v.toDate())),
  dangerSourceVariantStatus: v.optional(dangerSourceVariantStatusSchema),
  dangerSourceVariantType: v.optional(dangerSourceVariantTypeSchema),
  ownerRegion: v.optional(v.string()),
  regions: v.optional(v.array(v.string())),
  hasDaytimeDependency: v.optional(v.boolean()),
  avalancheType: v.optional(avalancheTypeSchema),
  aspects: v.optional(v.array(cardinalDirectionSchema)),
  elevationHigh: v.optional(v.number()),
  treelineHigh: v.optional(v.boolean()),
  elevationLow: v.optional(v.number()),
  treelineLow: v.optional(v.boolean()),
  aspectsOfExistence: v.optional(v.array(cardinalDirectionSchema)),
  elevationHighOfExistence: v.optional(v.number()),
  treelineHighOfExistence: v.optional(v.boolean()),
  elevationLowOfExistence: v.optional(v.number()),
  treelineLowOfExistence: v.optional(v.boolean()),
  dangerIncreaseWithElevation: v.optional(v.boolean()),
  highestDangerAspect: v.optional(cardinalDirectionSchema),
  dangerPeak: v.optional(dangerPeakSchema),
  slopeGradient: v.optional(slopeGradientSchema),
  runoutIntoGreen: v.optional(v.boolean()),
  penetrateDeepLayers: v.optional(v.boolean()),
  naturalRelease: v.optional(naturalReleaseSchema),
  dangerSigns: v.optional(v.array(dangerSignSchema)),
  eawsMatrixInformation: v.optional(eawsMatrixInformationSchema),
  comment: v.optional(v.string()),
  textcat: v.optional(v.string()),
  uncertainty: v.optional(v.string()),
  glidingSnowActivity: v.optional(glidingSnowActivitySchema),
  glidingSnowActivityValue: v.optional(v.number()),
  snowHeightUpperLimit: v.optional(v.number()),
  snowHeightLowerLimit: v.optional(v.number()),
  snowHeightAverage: v.optional(v.number()),
  zeroDegreeIsotherm: v.optional(v.boolean()),
  slabGrainShape: v.optional(grainShapeSchema),
  slabThicknessUpperLimit: v.optional(v.number()),
  slabThicknessLowerLimit: v.optional(v.number()),
  slabHandHardnessUpperLimit: v.optional(handHardnessSchema),
  slabHandHardnessLowerLimit: v.optional(handHardnessSchema),
  slabHardnessProfile: v.optional(hardnessProfileSchema),
  slabEnergyTransferPotential: v.optional(energyTransferPotentialSchema),
  slabDistribution: v.optional(distributionTypeSchema),
  weakLayerGrainShapes: v.optional(v.array(grainShapeSchema)),
  weakLayerGrainSizeUpperLimit: v.optional(v.number()),
  weakLayerGrainSizeLowerLimit: v.optional(v.number()),
  weakLayerPersistent: v.optional(v.boolean()),
  weakLayerThickness: v.optional(weakLayerThicknessSchema),
  weakLayerStrength: v.optional(weakLayerStrengthSchema),
  weakLayerWet: v.optional(v.boolean()),
  weakLayerCrustAbove: v.optional(crustPresenceSchema),
  weakLayerCrustBelow: v.optional(crustPresenceSchema),
  weakLayerPosition: v.optional(weakLayerPositionSchema),
  weakLayerCreation: v.optional(weakLayerCreationSchema),
  weakLayerDistribution: v.optional(distributionTypeSchema),
  dangerSpotRecognizability: v.optional(dangerSpotRecognizabilitySchema),
  remoteTriggering: v.optional(remoteTriggeringSchema),
  terrainTypes: v.optional(v.array(terrainTypeSchema)),
  looseSnowGrainShape: v.optional(grainShapeSchema),
  looseSnowMoisture: v.optional(moistureSchema),
});

export type DangerSourceVariant = v.InferOutput<typeof dangerSourceVariantSchema>;
