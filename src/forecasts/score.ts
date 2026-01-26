import { differenceInAzimuths } from "../calc/azimuth";
import { ScoringConfig } from "../types/config";
import {
    LineOfSightForecast,
    LineOfSightForecastResult,
} from "../types/forecast";

const HIGH_ELEVATION_THRESHOLD = 2000;

const defaultScoringConfig: Required<ScoringConfig> = {
    sunTooLowBelowDegrees: -5,
    minAzimuthDiffBelowFiveDegrees: 30,
    minAzimuthDiffBelowTenDegrees: 10,
    maxLowCloud: 25,
    maxTotalCloudCover: 40,
    maxHighCloudAtTarget: 10,
    maxPrecipitationAtTarget: 0.1,
    maxPrecipitation: 0.3,
    minVisibility: 15000,
    minLiftedIndex: 0.1,
    maxWindSpeed: 40,
    minAcceptableDewPointSpread: 1,
    idealDewPointSpread: 7,
    boundaryLayerMaxPenalty: 0.7,
};

export function scoreLineOfSightForecast(
    lineOfSightForecast: LineOfSightForecast,
    originElevation: number,
    targetElevation: number,
    scoringConfig: ScoringConfig = defaultScoringConfig
): LineOfSightForecastResult {
    const scoring: Required<ScoringConfig> = {
        ...defaultScoringConfig,
        ...scoringConfig,
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
    if (sunAltDeg < scoring.sunTooLowBelowDegrees) {
        return { score: 0, note: "Sun too low" };
    } else if (
        sunAltDeg > 0 &&
        sunAltDeg < 5 &&
        azimuthsDiff < scoring.minAzimuthDiffBelowFiveDegrees
    ) {
        return { score: 0, note: "Target too close to rising or setting sun" };
    } else if (
        sunAltDeg >= 5 &&
        sunAltDeg < 10 &&
        azimuthsDiff < scoring.minAzimuthDiffBelowTenDegrees
    ) {
        return { score: 0, note: "Target too close to rising or setting sun" };
    }

    const lowPoints =
        targetElevation >= HIGH_ELEVATION_THRESHOLD
            ? [origin, ...points]
            : [origin, ...points, target];

    // If too much low cloud at origin or any points in between, as well as at a not-high elevation target, no go.
    const maxLowCloud = Math.max(
        ...lowPoints.map((point) => point.cloudCoverLow)
    );
    if (maxLowCloud > scoring.maxLowCloud) {
        return { score: 0, note: `Too much low cloud, max ${maxLowCloud}%` };
    }

    // If total cloud cover anywhere is too high, no go.
    const maxTotalCloudCover = Math.max(
        ...allPoints.map((point) => point.cloudCover)
    );
    if (maxTotalCloudCover > scoring.maxTotalCloudCover) {
        return {
            score: 0,
            note: `Too much total cloud cover, max ${maxTotalCloudCover}%`,
        };
    }

    // If too much high cloud or rain at target, no go.
    if (
        targetElevation >= HIGH_ELEVATION_THRESHOLD &&
        (target.cloudCoverHigh > scoring.maxHighCloudAtTarget ||
            target.precipitation > scoring.maxPrecipitationAtTarget)
    ) {
        return {
            score: 0,
            note: `Too much high cloud and/or rain at the target, high cloud ${target.cloudCoverHigh}%, rain ${target.precipitation}mm`,
        };
    }

    // If too much rain at any point, no go.
    const maxPrecipitation = Math.max(
        ...allPoints.map((point) => point.precipitation)
    );
    if (maxPrecipitation > scoring.maxPrecipitation) {
        return { score: 0, note: `Too much rain, max ${maxPrecipitation}mm` };
    }

    // If visibility is limited at any point, no go.
    const minVisibility = Math.min(
        // If visibility is null, as it can be for historical responses, assume the minimum.
        ...allPoints.map((point) => point.visibility || scoring.minVisibility)
    );
    if (minVisibility < scoring.minVisibility) {
        return {
            score: 0,
            note: `Minimum visibility too low, ${(minVisibility / 1000).toFixed(1)}km`,
        };
    }

    // If the lifted index - a measure of atmosphere turbulance that can cause shimmer - is too low, no go.
    const minLiftedIndex = Math.min(
        // If lifted index is null, as it can be for historical responses, assume the minimum.
        ...allPoints.map((point) => point.liftedIndex || scoring.minLiftedIndex)
    );
    if (minLiftedIndex < scoring.minLiftedIndex) {
        return {
            score: 0,
            note: `Minimum lifted index is too low meaning unstable air and a shimmer risk, ${minLiftedIndex}`,
        };
    }

    // If the wind speed is too high at the origin or any points in between, as well as at a not-high elevation target, no go.
    const maxWindSpeed = Math.max(
        ...lowPoints.map((point) => point.windSpeed10m)
    );
    if (maxWindSpeed > scoring.maxWindSpeed) {
        return {
            score: 0,
            note: `Maximum wind speed too high, max ${maxWindSpeed}km/h`,
        };
    }

    /* Dew Point Spread */

    let dewPointSpreadScore;
    const minDewPointSpread = Math.min(
        ...allPoints.map((point) => point.temperature2m - point.dewPoint2m)
    );
    if (minDewPointSpread < scoring.minAcceptableDewPointSpread) {
        return {
            score: 0,
            note: `Minimum dew point spread too low, ${minDewPointSpread.toFixed(1)}°`,
        };
    } else if (minDewPointSpread < scoring.idealDewPointSpread) {
        dewPointSpreadScore =
            (minDewPointSpread - scoring.minAcceptableDewPointSpread) /
            (scoring.idealDewPointSpread - scoring.minAcceptableDewPointSpread);
    } else {
        dewPointSpreadScore = 1;
    }

    /* Boundary Layer Penalty */

    let boundaryLayerMultiplier = 1;
    if (origin.boundaryLayerHeight > originElevation) {
        const depthRatio = originElevation / origin.boundaryLayerHeight;
        boundaryLayerMultiplier =
            scoring.boundaryLayerMaxPenalty +
            (1 - scoring.boundaryLayerMaxPenalty) * depthRatio;
    }

    const baseScore = Math.round(dewPointSpreadScore * 100);
    const finalScore = Math.round(baseScore * boundaryLayerMultiplier);

    return {
        score: finalScore,
        note: `Base score ${baseScore} from minimum dew point spread of ${minDewPointSpread.toFixed(1)}°, adjusted by boundary layer multiplier of ${boundaryLayerMultiplier.toFixed(2)}`,
    };
}
