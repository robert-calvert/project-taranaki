import { z } from "zod";

/* Line of Sight JSON Configurations */

const geographicPointSchema = z.object({
    label: z.string().nonempty().optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(0).max(180),
    elevation: z.number().nonnegative(),
});

export type GeographicPoint = z.infer<typeof geographicPointSchema>;

const DEFAULT_TIMEZONE = "Pacific/Auckland";

const optionalNonNegativeNumberSchema = z.number().nonnegative().optional();
const zeroToOneHundredSchema = z.number().gte(0).lte(100).optional();
const scoringConfigSchema = z.object({
    sunTooLowBelowDegrees: z.number().optional(),
    minAzimuthDiffBelowFiveDegrees: optionalNonNegativeNumberSchema,
    minAzimuthDiffBelowTenDegrees: optionalNonNegativeNumberSchema,
    maxLowCloud: zeroToOneHundredSchema,
    maxTotalCloudCover: zeroToOneHundredSchema,
    maxMidCloudAtTarget: zeroToOneHundredSchema,
    maxPrecipitationAtTarget: optionalNonNegativeNumberSchema,
    maxPrecipitation: optionalNonNegativeNumberSchema,
    minLiftedIndex: z.number().optional(),
    maxWindSpeed: optionalNonNegativeNumberSchema,
    maxAerosolOpticalDepth: optionalNonNegativeNumberSchema,
    idealAerosolOpticalDepth: optionalNonNegativeNumberSchema,
    minAcceptableVisibility: optionalNonNegativeNumberSchema,
    idealVisibility: optionalNonNegativeNumberSchema,
    minDewPointSpreadForLowVis: optionalNonNegativeNumberSchema,
    minAcceptableDewPointSpread: z.number().optional(),
    idealDewPointSpread: optionalNonNegativeNumberSchema,
    boundaryLayerMaxPenalty: z.number().gte(0).lte(1).optional(),
    hazeMaxPenalty: z.number().gte(0).lte(1).optional(),
});

export type ScoringConfig = z.infer<typeof scoringConfigSchema>;

export const lineOfSightConfigSchema = z.object({
    timezone: z.string().nonempty().default(DEFAULT_TIMEZONE),
    origin: geographicPointSchema,
    target: geographicPointSchema,
    points: z.array(geographicPointSchema).nonempty().optional(),
    scoring: scoringConfigSchema.optional(),
});

export type LineOfSightConfig = z.infer<typeof lineOfSightConfigSchema>;

/* Command Arguments */

export const DEFAULT_REFRACTION = 0.17;

export const refractionArgumentSchema = z.coerce
    .number()
    .gte(0)
    .lte(0.5)
    .default(DEFAULT_REFRACTION);
