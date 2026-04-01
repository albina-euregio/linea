/**
 * Danger Source Data Models
 * Defines the structure for avalanche danger source information using Zod validation schemas
 */

import { z } from "zod";

// ============================================================================
// Enum Schemas
// ============================================================================

export const dangerSourceVariantStatusSchema = z.enum(["active", "dormant", "inactive"]);
export type DangerSourceVariantStatus = z.infer<typeof dangerSourceVariantStatusSchema>;

export const dangerSourceVariantTypeSchema = z.enum(["forecast", "analysis"]);
export type DangerSourceVariantType = z.infer<typeof dangerSourceVariantTypeSchema>;

export const avalancheTypeSchema = z.enum(["slab", "loose", "glide"]);
export type AvalancheType = z.infer<typeof avalancheTypeSchema>;

export const cardinalDirectionSchema = z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);
export type CardinalDirection = z.infer<typeof cardinalDirectionSchema>;

export const dangerPeakSchema = z.enum([
  "evening",
  "first_night_half",
  "second_night_half",
  "morning",
  "forenoon",
  "afternoon",
]);
export type DangerPeak = z.infer<typeof dangerPeakSchema>;

export const slopeGradientSchema = z.enum([
  "moderately_steep",
  "steep",
  "very_steep",
  "extremely_steep",
]);
export type SlopeGradient = z.infer<typeof slopeGradientSchema>;

export const naturalReleaseSchema = z.enum(["likely", "possible", "unlikely"]);
export type NaturalRelease = z.infer<typeof naturalReleaseSchema>;

export const dangerSignSchema = z.enum([
  "shooting_cracks",
  "whumpfing",
  "fresh_avalanches",
  "glide_cracks",
]);
export type DangerSign = z.infer<typeof dangerSignSchema>;

export const dangerRatingSchema = z.enum([
  "missing",
  "no_snow",
  "no_rating",
  "low",
  "moderate",
  "considerable",
  "high",
  "very_high",
]);
export type DangerRating = z.infer<typeof dangerRatingSchema>;

export const dangerRatingModificatorSchema = z.enum(["minus", "equal", "plus"]);
export type DangerRatingModificator = z.infer<typeof dangerRatingModificatorSchema>;

export const avalancheSizeSchema = z.enum(["small", "medium", "large", "very_large", "extreme"]);
export type AvalancheSize = z.infer<typeof avalancheSizeSchema>;

export const snowpackStabilitySchema = z.enum(["good", "fair", "poor", "very_poor"]);
export type SnowpackStability = z.infer<typeof snowpackStabilitySchema>;

export const frequencySchema = z.enum(["none", "few", "some", "many"]);
export type Frequency = z.infer<typeof frequencySchema>;

export const glidingSnowActivitySchema = z.enum(["low", "medium", "high"]);
export type GlidingSnowActivity = z.infer<typeof glidingSnowActivitySchema>;

export const grainShapeSchema = z.enum([
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
export type GrainShape = z.infer<typeof grainShapeSchema>;

export const handHardnessSchema = z.enum([
  "fist",
  "four_fingers",
  "one_finger",
  "pencil",
  "knife",
  "ice",
]);
export type HandHardness = z.infer<typeof handHardnessSchema>;

export const hardnessProfileSchema = z.enum(["decreasing", "steady", "increasing"]);
export type HardnessProfile = z.infer<typeof hardnessProfileSchema>;

export const energyTransferPotentialSchema = z.enum(["low", "medium", "high", "very_high"]);
export type EnergyTransferPotential = z.infer<typeof energyTransferPotentialSchema>;

export const distributionTypeSchema = z.enum(["isolated", "specific", "widespread"]);
export type DistributionType = z.infer<typeof distributionTypeSchema>;

export const weakLayerThicknessSchema = z.enum(["thick", "thin"]);
export type WeakLayerThickness = z.infer<typeof weakLayerThicknessSchema>;

export const weakLayerStrengthSchema = z.enum(["low", "medium", "high", "very_high"]);
export type WeakLayerStrength = z.infer<typeof weakLayerStrengthSchema>;

export const crustPresenceSchema = z.enum(["no", "partly", "yes"]);
export type CrustPresence = z.infer<typeof crustPresenceSchema>;

export const weakLayerPositionSchema = z.enum(["upper", "middle", "lower", "ground"]);
export type WeakLayerPosition = z.infer<typeof weakLayerPositionSchema>;

export const weakLayerCreationSchema = z.enum([
  "radiation_recrystallization",
  "diurnal_recrystallization",
  "melt_layer_recrystallization",
  "surface_hoar_formation",
]);
export type WeakLayerCreation = z.infer<typeof weakLayerCreationSchema>;

export const dangerSpotRecognizabilitySchema = z.enum(["very_easy", "easy", "hard", "very_hard"]);
export type DangerSpotRecognizability = z.infer<typeof dangerSpotRecognizabilitySchema>;

export const remoteTriggeringSchema = z.enum(["likely", "possible", "unlikely"]);
export type RemoteTriggering = z.infer<typeof remoteTriggeringSchema>;

export const terrainTypeSchema = z.enum([
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
export type TerrainType = z.infer<typeof terrainTypeSchema>;

export const moistureSchema = z.enum(["wet", "moist", "dry"]);
export type Moisture = z.infer<typeof moistureSchema>;

// ============================================================================
// Object Schemas
// ============================================================================

const dangerSourceSchema = z.object({
  id: z.string().nullable(),
  ownerRegion: z.string(),
  creationDate: z.coerce.date(),
  title: z.string(),
  description: z.string().optional(),
});

export type DangerSource = z.infer<typeof dangerSourceSchema>;

const eawsMatrixInformationSchema = z.object({
  dangerRating: dangerRatingSchema.optional(),
  dangerRatingModificator: dangerRatingModificatorSchema.optional(),
  avalancheSize: avalancheSizeSchema.optional(),
  snowpackStability: snowpackStabilitySchema.optional(),
  frequency: frequencySchema.optional(),
  avalancheSizeValue: z.number().optional(),
  snowpackStabilityValue: z.number().optional(),
  frequencyValue: z.number().optional(),
});

export type EAWSMatrixInformation = z.infer<typeof eawsMatrixInformationSchema>;

export const dangerSourceVariantSchema = z
  .object({
    id: z.string().nullable().optional(),
    originalDangerSourceVariantId: z.string().optional(),
    forecastDangerSourceVariantId: z.string().optional(),
    dangerSource: dangerSourceSchema.nullable().optional(),
    title: z.string().optional(),
    creationDate: z.coerce.date().optional(),
    updateDate: z.coerce.date().optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    dangerSourceVariantStatus: dangerSourceVariantStatusSchema.optional(),
    dangerSourceVariantType: dangerSourceVariantTypeSchema.optional(),
    ownerRegion: z.string().optional(),
    regions: z.array(z.string()).optional(),
    hasDaytimeDependency: z.boolean().optional(),
    avalancheType: avalancheTypeSchema.optional(),
    aspects: z.array(cardinalDirectionSchema).optional(),
    elevationHigh: z.number().optional(),
    treelineHigh: z.boolean().optional(),
    elevationLow: z.number().optional(),
    treelineLow: z.boolean().optional(),
    aspectsOfExistence: z.array(cardinalDirectionSchema).optional(),
    elevationHighOfExistence: z.number().optional(),
    treelineHighOfExistence: z.boolean().optional(),
    elevationLowOfExistence: z.number().optional(),
    treelineLowOfExistence: z.boolean().optional(),
    dangerIncreaseWithElevation: z.boolean().optional(),
    highestDangerAspect: cardinalDirectionSchema.optional(),
    dangerPeak: dangerPeakSchema.optional(),
    slopeGradient: slopeGradientSchema.optional(),
    runoutIntoGreen: z.boolean().optional(),
    penetrateDeepLayers: z.boolean().optional(),
    naturalRelease: naturalReleaseSchema.optional(),
    dangerSigns: z.array(dangerSignSchema).optional(),
    eawsMatrixInformation: eawsMatrixInformationSchema.optional(),
    comment: z.string().optional(),
    textcat: z.string().optional(),
    uncertainty: z.string().optional(),
    glidingSnowActivity: glidingSnowActivitySchema.optional(),
    glidingSnowActivityValue: z.number().optional(),
    snowHeightUpperLimit: z.number().optional(),
    snowHeightLowerLimit: z.number().optional(),
    snowHeightAverage: z.number().optional(),
    zeroDegreeIsotherm: z.boolean().optional(),
    slabGrainShape: grainShapeSchema.optional(),
    slabThicknessUpperLimit: z.number().optional(),
    slabThicknessLowerLimit: z.number().optional(),
    slabHandHardnessUpperLimit: handHardnessSchema.optional(),
    slabHandHardnessLowerLimit: handHardnessSchema.optional(),
    slabHardnessProfile: hardnessProfileSchema.optional(),
    slabEnergyTransferPotential: energyTransferPotentialSchema.optional(),
    slabDistribution: distributionTypeSchema.optional(),
    weakLayerGrainShapes: z.array(grainShapeSchema).optional(),
    weakLayerGrainSizeUpperLimit: z.number().optional(),
    weakLayerGrainSizeLowerLimit: z.number().optional(),
    weakLayerPersistent: z.boolean().optional(),
    weakLayerThickness: weakLayerThicknessSchema.optional(),
    weakLayerStrength: weakLayerStrengthSchema.optional(),
    weakLayerWet: z.boolean().optional(),
    weakLayerCrustAbove: crustPresenceSchema.optional(),
    weakLayerCrustBelow: crustPresenceSchema.optional(),
    weakLayerPosition: weakLayerPositionSchema.optional(),
    weakLayerCreation: weakLayerCreationSchema.optional(),
    weakLayerDistribution: distributionTypeSchema.optional(),
    dangerSpotRecognizability: dangerSpotRecognizabilitySchema.optional(),
    remoteTriggering: remoteTriggeringSchema.optional(),
    terrainTypes: z.array(terrainTypeSchema).optional(),
    looseSnowGrainShape: grainShapeSchema.optional(),
    looseSnowMoisture: moistureSchema.optional(),
  })
  .passthrough();

export type DangerSourceVariant = z.infer<typeof dangerSourceVariantSchema>;
