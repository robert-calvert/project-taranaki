import { GeographicPoint } from "../types/config";

export const EARTH_MEAN_RADIUS_METRES = 6_371_000;

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function haversineDistanceMetres(
    a: GeographicPoint,
    b: GeographicPoint
): number {
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);
    const dLat = lat2 - lat1;
    const dLon = toRadians(b.longitude - a.longitude);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);

    const h =
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    return EARTH_MEAN_RADIUS_METRES * c;
}
