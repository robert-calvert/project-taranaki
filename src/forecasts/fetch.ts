import { ZodType } from "zod";
import { PointForecast, SunriseSunsetPair } from "../types/forecast";
import {
    DAILY_VARIABLES,
    HOURLY_VARIABLES,
    openMeteoDailyResponseSchema,
    openMeteoHourlyResponseSchema,
} from "../types/openMeteo";
import { apiGet } from "../util/api";
import * as SunCalc from "suncalc";
import { toDegrees } from "../calc/func";
import dayjs from "dayjs";

async function sendOpenMeteoRequest<T>(
    periodKey: string,
    periodVariables: string,
    validationSchema: ZodType<T>,
    forecastDays: number,
    latitude: number,
    longitude: number,
    timezone: string,
    asAtDate?: string
): Promise<T> {
    let requestParams = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        [periodKey]: periodVariables,
        timezone: timezone,
        forecast_days: forecastDays.toString(),
    });

    if (asAtDate) {
        requestParams.append("start_date", asAtDate);
        requestParams.append("end_date", asAtDate);
        requestParams.delete("forecast_days");
    }

    const requestUrl = asAtDate
        ? "https://archive-api.open-meteo.com/v1/archive?"
        : "https://api.open-meteo.com/v1/forecast?";
    return await apiGet(
        requestUrl + requestParams.toString(),
        validationSchema
    );
}

export async function getDailySunriseSunset(
    forecastDays: number,
    latitude: number,
    longitude: number,
    timezone: string,
    asAtDate?: string
): Promise<Record<string, SunriseSunsetPair>> {
    const innerResponse = (
        await sendOpenMeteoRequest(
            "daily",
            DAILY_VARIABLES,
            openMeteoDailyResponseSchema,
            forecastDays,
            latitude,
            longitude,
            timezone,
            asAtDate
        )
    ).daily;

    let pairs: Record<string, SunriseSunsetPair> = {};
    innerResponse.time.forEach((dateString, index) => {
        const sunrise = dayjs(innerResponse.sunrise[index]);
        const sunset = dayjs(innerResponse.sunset[index]);

        pairs[dateString] = {
            sunriseMin: sunrise.subtract(30, "minutes"),
            sunriseMax: sunrise.add(120, "minutes"),
            sunsetMin: sunset.subtract(120, "minutes"),
            sunsetMax: sunset.add(30, "minutes"),
        };
    });

    return pairs;
}

export async function getHourlyForecasts(
    forecastDays: number,
    latitude: number,
    longitude: number,
    timezone: string,
    asAtDate?: string
): Promise<PointForecast[]> {
    const innerResponse = (
        await sendOpenMeteoRequest(
            "hourly",
            HOURLY_VARIABLES,
            openMeteoHourlyResponseSchema,
            forecastDays,
            latitude,
            longitude,
            timezone,
            asAtDate
        )
    ).hourly;

    return innerResponse.time
        .filter((time) => (asAtDate ? true : new Date(time) > new Date()))
        .map((time, index) => {
            const sunPosition = SunCalc.getPosition(
                new Date(time),
                latitude,
                longitude
            );

            return {
                dateTime: dayjs(time),
                temperature2m: innerResponse.temperature_2m[index],
                dewPoint2m: innerResponse.dew_point_2m[index],
                visibility: innerResponse.visibility[index],
                cloudCoverHigh: innerResponse.cloud_cover_high[index],
                cloudCoverMid: innerResponse.cloud_cover_mid[index],
                cloudCoverLow: innerResponse.cloud_cover_low[index],
                cloudCover: innerResponse.cloud_cover[index],
                precipitation: innerResponse.precipitation[index],
                boundaryLayerHeight: innerResponse.boundary_layer_height[index],
                liftedIndex: innerResponse.lifted_index[index],
                windSpeed10m: innerResponse.wind_speed_10m[index],
                sunAltitudeDegrees: toDegrees(sunPosition.altitude),
                // Convert SunCalc's South-based azimuth to a North-based one.
                sunAzimuthDegrees: (toDegrees(sunPosition.azimuth) + 180) % 360,
            };
        });
}
