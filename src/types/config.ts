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

const zeroToOneHundredSchema = z.number().gte(0).lte(100).optional();
const scoringConfigSchema = z.object({
    maxLowCloud: zeroToOneHundredSchema,
    maxTotalCloudCover: zeroToOneHundredSchema,
    maxHighCloudAtTarget: zeroToOneHundredSchema,
    maxPrecipitationAtTarget: z.number().positive().optional(),
    maxPrecipitation: z.number().positive().optional(),
    minAcceptableVisibility: z.number().positive().optional(),
    idealVisibility: z.number().positive().optional(),
    minAcceptableDewPointSpread: z.number().positive().optional(),
    idealDewPointSpread: z.number().positive().optional(),
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
