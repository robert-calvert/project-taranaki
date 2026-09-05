import dayjs from "dayjs";
import { differenceInAzimuths } from "../calc/azimuth";
import { ScoringConfig } from "../types/config";
import {
    LineOfSightForecast,
    LineOfSightForecastResult,
} from "../types/forecast";

const HIGH_ELEVATION_THRESHOLD = 2000;

export const defaultScoringConfig: Required<ScoringConfig> = {
    sunTooLowBelowDegrees: -5,
    minAzimuthDiffBelowFiveDegrees: 30,
    minAzimuthDiffBelowTenDegrees: 10,
    maxLowCloud: 40,
    maxMidCloudAtTarget: 20,
    maxTotalCloudCover: 50,
    maxPrecipitationAtTarget: 0.1,
    maxPrecipitation: 0.3,
    minLiftedIndex: 0.1,
    maxWindSpeed: 40,
    maxAerosolOpticalDepth: 0.3,
    idealAerosolOpticalDepth: 0.05,
    minAcceptableVisibility: 10000,
    idealVisibility: 15000,
    minDewPointSpreadAtOriginForLowVis: 2,
    minAcceptableDewPointSpread: 0.2,
    idealDewPointSpread: 7,
    boundaryLayerMaxPenalty: 0.8,
    hazeMaxPenalty: 0.6,
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

    // If too much mid cloud or rain at target, no go.
    if (
        targetElevation >= HIGH_ELEVATION_THRESHOLD &&
        (target.cloudCoverMid > scoring.maxMidCloudAtTarget ||
            target.precipitation > scoring.maxPrecipitationAtTarget)
    ) {
        return {
            score: 0,
            note: `Too much cloud and/or rain at the target, mid. cloud ${target.cloudCoverMid}%, rain ${target.precipitation}mm`,
        };
    }

    // If too much rain at any point, no go.
    const maxPrecipitation = Math.max(
        ...allPoints.map((point) => point.precipitation)
    );
    if (maxPrecipitation > scoring.maxPrecipitation) {
        return { score: 0, note: `Too much rain, max ${maxPrecipitation}mm` };
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

    // If the aerosol optical depth is too high at any point, indicating thick haze, then no go.
    const maxAerosolOpticalDepth = Math.max(
        // If aerosol optical depth is null, as it can be for historical responses, assume the IDEAL.
        // This is because this value is later used for a sliding scale multiplier, so using the ideal means it doesn't affect the score.
        ...allPoints.map(
            (point) =>
                point.aerosolOpticalDepth || scoring.idealAerosolOpticalDepth
        )
    );
    if (maxAerosolOpticalDepth > scoring.maxAerosolOpticalDepth) {
        return {
            score: 0,
            note: `Maximum aerosol haze too thick, ${maxAerosolOpticalDepth}`,
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

    /* Visibility */

    // If visibility is limited at any point, no go.
    const minVisibility = Math.min(
        // If visibility is null, as it can be for historical responses, assume the minimum.
        ...allPoints.map(
            (point) => point.visibility || scoring.minAcceptableVisibility
        )
    );
    if (minVisibility < scoring.minAcceptableVisibility) {
        return {
            score: 0,
            note: `Minimum visibility too low, ${(minVisibility / 1000).toFixed(1)}km`,
        };
    }

    const originSpread = origin.temperature2m - origin.dewPoint2m;
    if (
        minVisibility < scoring.idealVisibility &&
        dayjs().isBefore(lineOfSightForecast.dateTime)
    ) {
        if (originSpread < scoring.minDewPointSpreadAtOriginForLowVis) {
            return {
                score: 0,
                note: `Sub-optimal visibility combined with low dew point spread at origin indicates wet mist/fog forming, ${(minVisibility / 1000).toFixed(1)}km and ${minDewPointSpread.toFixed(1)}°`,
            };
        }
    }

    /* Boundary Layer Penalty */

    let boundaryLayerMultiplier = 1;
    if (origin.boundaryLayerHeight > originElevation) {
        const depthRatio = originElevation / origin.boundaryLayerHeight;
        boundaryLayerMultiplier =
            scoring.boundaryLayerMaxPenalty +
            (1 - scoring.boundaryLayerMaxPenalty) * depthRatio;
    }

    /* Haze Penalty */

    let hazeMultiplier = 1;
    if (maxAerosolOpticalDepth > scoring.idealAerosolOpticalDepth) {
        const hazeRatio =
            (maxAerosolOpticalDepth - scoring.idealAerosolOpticalDepth) /
            (scoring.maxAerosolOpticalDepth - scoring.idealAerosolOpticalDepth);
        hazeMultiplier = 1 - hazeRatio * scoring.hazeMaxPenalty;
    }

    const baseScore = Math.round(dewPointSpreadScore * 100);
    const finalScore = Math.round(
        baseScore * boundaryLayerMultiplier * hazeMultiplier
    );

    return {
        score: finalScore,
        note: `Base score ${baseScore} from minimum dew point spread of ${minDewPointSpread.toFixed(1)}°, adjusted by boundary layer multiplier of ${boundaryLayerMultiplier.toFixed(2)} and haze multiplier of ${hazeMultiplier.toFixed(2)}`,
    };
}
