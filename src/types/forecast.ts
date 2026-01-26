import { Dayjs } from "dayjs";

export type SunriseSunsetPair = {
    sunriseMin: Dayjs;
    sunriseMax: Dayjs;
    sunsetMin: Dayjs;
    sunsetMax: Dayjs;
};

export type PointForecast = {
    dateTime: Dayjs;
    temperature2m: number;
    dewPoint2m: number;
    visibility: number | null; // null for some historical responses
    cloudCoverHigh: number;
    cloudCoverMid: number;
    cloudCoverLow: number;
    cloudCover: number;
    precipitation: number;
    boundaryLayerHeight: number;
    liftedIndex: number | null; // null for some historical responses
    windSpeed10m: number;
    sunAltitudeDegrees: number;
    sunAzimuthDegrees: number;
};

export type LineOfSightForecast = {
    dateTime: Dayjs;
    originForecast: PointForecast;
    targetForecast: PointForecast;
    pointForecasts: PointForecast[];
    azimuthDegrees: number;
};

export type LineOfSightForecastResult = {
    score: number;
    note: string;
};
