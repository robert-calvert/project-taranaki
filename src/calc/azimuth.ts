import { toDegrees, toRadians } from "./func";

export function differenceInAzimuths(
    losAzimuthDegrees: number,
    sunAzimuthDegrees: number
): number {
    const diff = sunAzimuthDegrees - losAzimuthDegrees;
    const diffWrapped = ((diff + 180) % 360) - 180;
    return Math.abs(diffWrapped);
}

export function computeAzimuth(
    originLat: number,
    originLon: number,
    targetLat: number,
    targetLon: number
): number {
    const φ1 = toRadians(originLat);
    const φ2 = toRadians(targetLat);
    const λ1 = toRadians(originLon);
    const λ2 = toRadians(targetLon);

    const dλ = λ2 - λ1;

    const y = Math.sin(dλ) * Math.cos(φ2);
    const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);

    let θ = Math.atan2(y, x);

    let bearing = toDegrees(θ);
    bearing = (bearing + 360) % 360;

    return bearing;
}
