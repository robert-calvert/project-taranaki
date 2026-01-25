export type SunriseSunsetPair = {
    sunriseDateTime: string;
    sunsetDateTime: string;
};

export type PointForecast = {
    dateTime: string;
    temperature2m: number;
    dewPoint2m: number;
    visibility: number | null; // null for some historical responses
    cloudCoverHigh: number;
    cloudCoverMid: number;
    cloudCoverLow: number;
    cloudCover: number;
    precipitation: number;
    sunAltitudeDegrees: number;
    sunAzimuthDegrees: number;
};

export type LineOfSightForecast = {
    dateTime: string;
    originForecast: PointForecast;
    targetForecast: PointForecast;
    pointForecasts: PointForecast[];
    azimuthDegrees: number;
};

export type LineOfSightForecastResult = {
    score: number;
    note: string;
};
