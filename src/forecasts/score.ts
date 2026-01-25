import { differenceInAzimuths } from "../calc/azimuth";
import { ScoringConfig } from "../types/config";
import {
    LineOfSightForecast,
    LineOfSightForecastResult,
} from "../types/forecast";

const defaultScoringConfig: Required<ScoringConfig> = {
    maxLowCloud: 25,
    maxTotalCloudCover: 40,
    maxHighCloudAtTarget: 10,
    maxPrecipitationAtTarget: 0.1,
    maxPrecipitation: 0.3,
    minAcceptableVisibility: 15000,
    idealVisibility: 24000,
    minAcceptableDewPointSpread: 1,
    idealDewPointSpread: 7.5,
};

export function scoreLineOfSightForecast(
    lineOfSightForecast: LineOfSightForecast,
    scoringConfig: ScoringConfig = defaultScoringConfig,
    highElevationTarget: boolean = true
): LineOfSightForecastResult {
    const config: Required<ScoringConfig> = {
        ...defaultScoringConfig,
        ...scoringConfig,
    };

    let zeroResult: LineOfSightForecastResult = {
        score: 0,
        note: "Unknown failure",
    };

    const origin = lineOfSightForecast.originForecast;
    const target = lineOfSightForecast.targetForecast;
    const points = lineOfSightForecast.pointForecasts;
    const allPoints = [origin, target, ...points];

    /* Hard failure cases */

    // If you're close to looking directly into the sun, no go, but OK if it's just below the horizon.
    // We're also sense checking it being too dark based on the sun's altitude here.
    const sunAltDeg = origin.sunAltitudeDegrees;
    const azimuthsDiff = differenceInAzimuths(
        lineOfSightForecast.azimuthDegrees,
        origin.sunAzimuthDegrees
    );
    if (sunAltDeg < -5) {
        zeroResult.note = "Sun too low";
        return zeroResult;
    } else if (sunAltDeg > 0 && sunAltDeg < 5 && azimuthsDiff < 30) {
        zeroResult.note = "Target too close to rising or setting sun";
        return zeroResult;
    } else if (sunAltDeg >= 5 && sunAltDeg < 10 && azimuthsDiff < 10) {
        zeroResult.note = "Target too close to rising or setting sun";
        return zeroResult;
    }

    // If too much low cloud at origin or any points in between, as well as at a not-high elevation target, no go.
    const lowCloudPoints = highElevationTarget
        ? [origin, ...points]
        : [origin, ...points, target];
    const maxLowCloud = Math.max(
        ...lowCloudPoints.map((point) => point.cloudCoverLow)
    );
    if (maxLowCloud >= config.maxLowCloud) {
        zeroResult.note = `Too much low cloud, max ${maxLowCloud}%`;
        return zeroResult;
    }

    // If total cloud cover anywhere is too high, no go.
    const maxTotalCloudCover = Math.max(
        ...allPoints.map((point) => point.cloudCover)
    );
    if (maxTotalCloudCover >= config.maxTotalCloudCover) {
        zeroResult.note = `Too much total cloud cover, max ${maxTotalCloudCover}%`;
        return zeroResult;
    }

    // If too much high cloud or rain at target, no go.
    if (
        highElevationTarget &&
        (target.cloudCoverHigh >= config.maxHighCloudAtTarget ||
            target.precipitation > config.maxPrecipitationAtTarget)
    ) {
        zeroResult.note = `Too much high cloud and/or rain at the target, high cloud ${target.cloudCoverHigh}%, rain ${target.precipitation}mm`;
        return zeroResult;
    }

    // If too much rain at any point, no go.
    const maxPrecipitation = Math.max(
        ...allPoints.map((point) => point.precipitation)
    );
    if (maxPrecipitation >= config.maxPrecipitation) {
        zeroResult.note = `Too much rain, max ${maxPrecipitation}mm`;
        return zeroResult;
    }

    /* Visibility */

    let visibilityScore;
    const visibilityWeight = 0.1;

    const minVisibility = Math.min(
        // If visibility is null, as it can be for historical responses, assume ideal visibility.
        ...allPoints.map((point) => point.visibility || config.idealVisibility)
    );
    if (minVisibility < config.minAcceptableVisibility) {
        zeroResult.note = `Minimum visibility too low, ${(minVisibility / 1000).toFixed(1)}km`;
        return zeroResult;
    } else if (minVisibility < config.idealVisibility) {
        visibilityScore =
            (minVisibility - config.minAcceptableVisibility) /
            (config.idealVisibility - config.minAcceptableVisibility);
    } else {
        visibilityScore = 1;
    }

    /* Dew Point Spread */

    let dewPointSpreadScore;
    const dewPointSpreadWeight = 0.9;

    const minDewPointSpread = Math.min(
        ...allPoints.map((point) => point.temperature2m - point.dewPoint2m)
    );
    if (minDewPointSpread < config.minAcceptableDewPointSpread) {
        zeroResult.note = `Minimum dew point spread too low, ${minDewPointSpread.toFixed(1)}°`;
        return zeroResult;
    } else if (minDewPointSpread < config.idealDewPointSpread) {
        dewPointSpreadScore =
            (minDewPointSpread - config.minAcceptableDewPointSpread) /
            (config.idealDewPointSpread - config.minAcceptableDewPointSpread);
    } else {
        dewPointSpreadScore = 1;
    }

    const rawScore =
        visibilityWeight * visibilityScore +
        dewPointSpreadWeight * dewPointSpreadScore;
    return {
        score: Math.round(rawScore * 100),
        note: `Dew point spread score ${Math.round(dewPointSpreadScore * 100)}, visibility score ${Math.round(visibilityScore * 100)}`,
    };
}
