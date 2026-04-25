import { z } from "zod";

const dateTimeSchema = z.iso.datetime({ local: true });

/* Daily */

export const DAILY_VARIABLES = "sunrise,sunset";

export const openMeteoDailyResponseSchema = z.object({
    daily: z.object({
        time: z.array(z.iso.date()).nonempty(),
        sunrise: z.array(dateTimeSchema).nonempty(),
        sunset: z.array(dateTimeSchema).nonempty(),
    }),
});

export type OpenMeteoDailyResponse = z.infer<
    typeof openMeteoDailyResponseSchema
>;

/* Hourly */

export const HOURLY_VARIABLES =
    "temperature_2m,dew_point_2m,visibility,cloud_cover_mid,cloud_cover_low,cloud_cover,precipitation,boundary_layer_height,lifted_index,wind_speed_10m";

const nonEmptyNumberArraySchema = z.array(z.number()).nonempty();
const nonEmptyNullableNumberArraySchema = z
    .array(z.number().nullable())
    .nonempty();
const zeroToHundredVariableArraySchema = z
    .array(z.number().int().gte(0).lte(100))
    .nonempty();

export const openMeteoHourlyResponseSchema = z.object({
    hourly: z.object({
        time: z.array(dateTimeSchema).nonempty(),
        temperature_2m: nonEmptyNumberArraySchema,
        dew_point_2m: nonEmptyNumberArraySchema,
        visibility: nonEmptyNullableNumberArraySchema,
        cloud_cover_mid: zeroToHundredVariableArraySchema,
        cloud_cover_low: zeroToHundredVariableArraySchema,
        cloud_cover: zeroToHundredVariableArraySchema,
        precipitation: nonEmptyNumberArraySchema,
        boundary_layer_height: nonEmptyNumberArraySchema,
        lifted_index: nonEmptyNullableNumberArraySchema,
        wind_speed_10m: nonEmptyNumberArraySchema,
    }),
});

export type OpenMeteoHourlyResponse = z.infer<
    typeof openMeteoHourlyResponseSchema
>;

/* Air Quality */

export const AIR_QUALITY_VARIABLES = "aerosol_optical_depth";

export const openMeteoHourlyAirQualityResponseSchema = z.object({
    hourly: z.object({
        time: z.array(dateTimeSchema).nonempty(),
        aerosol_optical_depth: nonEmptyNullableNumberArraySchema,
    }),
});

export type OpenMeteoHourlyAirQualityResponse = z.infer<
    typeof openMeteoHourlyAirQualityResponseSchema
>;
