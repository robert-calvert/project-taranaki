import { VisibilityResult } from "../types/calc";
import { GeographicPoint } from "../types/config";
import {
    EARTH_MEAN_RADIUS_METRES,
    haversineDistanceMetres,
    toDegrees,
} from "./func";

export function calculateVisibleTargetHeight(
    origin: GeographicPoint,
    target: GeographicPoint,
    refractionK?: number
): VisibilityResult {
    const k = refractionK ?? 0;
    const Re =
        k !== 0 ? EARTH_MEAN_RADIUS_METRES / (1 - k) : EARTH_MEAN_RADIUS_METRES;

    const d = haversineDistanceMetres(origin, target);
    const h1 = origin.elevation;
    const h2 = target.elevation;

    const dH1 = Math.sqrt(2 * Re * h1 + h1 * h1);
    const dH2 = Math.sqrt(2 * Re * h2 + h2 * h2);

    const maxLoS = dH1 + dH2;

    // If even the tops cannot see each other, nothing is visible.
    if (d > maxLoS) {
        return {
            visibleHeightMetres: 0,
            visibleFraction: 0,
            distanceMetres: d,
            angularHeightDegrees: 0,
        };
    }

    // If ground level at target is visible, the whole target is visible.
    if (d <= dH1) {
        return {
            visibleHeightMetres: h2,
            visibleFraction: h2 > 0 ? 1 : 0,
            distanceMetres: d,
            angularHeightDegrees: toDegrees(h2 / d),
        };
    }

    const D = d - dH1;
    const hMin = -Re + Math.sqrt(Re * Re + D * D);

    let visibleHeight = h2 - hMin;
    if (!Number.isFinite(visibleHeight) || visibleHeight < 0) {
        visibleHeight = 0;
    }

    if (visibleHeight > h2) {
        visibleHeight = h2;
    }

    return {
        visibleHeightMetres: visibleHeight,
        visibleFraction: h2 > 0 ? visibleHeight / h2 : 0,
        distanceMetres: d,
        angularHeightDegrees: toDegrees(visibleHeight / d),
    };
}
