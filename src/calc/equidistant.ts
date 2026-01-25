import { GeographicPoint } from "../types/config";
import { toDegrees, toRadians } from "./func";

function latLonToUnitVector(
    latDeg: number,
    lonDeg: number
): [number, number, number] {
    const lat = toRadians(latDeg);
    const lon = toRadians(lonDeg);
    const cosLat = Math.cos(lat);
    return [cosLat * Math.cos(lon), cosLat * Math.sin(lon), Math.sin(lat)];
}

function unitVectorToLatLon(x: number, y: number, z: number): [number, number] {
    const hyp = Math.sqrt(x * x + y * y);
    const lat = Math.atan2(z, hyp);
    const lon = Math.atan2(y, x);
    return [toDegrees(lat), toDegrees(lon)];
}

export function getEquidistantPointsOnGreatCircle(
    origin: GeographicPoint,
    target: GeographicPoint,
    n: number
): GeographicPoint[] {
    if (n <= 0) {
        return [];
    }

    const losLabel = `${origin.label ?? "Origin"} -> ${target.label ?? "Target"}`;

    const p0 = latLonToUnitVector(origin.latitude, origin.longitude);
    const p1 = latLonToUnitVector(target.latitude, target.longitude);

    const dot = p0[0] * p1[0] + p0[1] * p1[1] + p0[2] * p1[2];
    const clampedDot = Math.min(1, Math.max(-1, dot));
    const theta = Math.acos(clampedDot);
    if (theta === 0) {
        return Array.from({ length: n }, (_, i) => {
            const t = (i + 1) / (n + 1);
            return {
                label: `${losLabel} ${i + 1}/${n}`,
                latitude: origin.latitude,
                longitude: origin.longitude,
                elevation:
                    origin.elevation +
                    t * (target.elevation - origin.elevation),
            };
        });
    }

    const sinTheta = Math.sin(theta);

    const points: GeographicPoint[] = [];
    for (let i = 1; i <= n; i++) {
        const f = i / (n + 1);

        const sinA = Math.sin((1 - f) * theta);
        const sinB = Math.sin(f * theta);

        const x = (sinA * p0[0] + sinB * p1[0]) / sinTheta;
        const y = (sinA * p0[1] + sinB * p1[1]) / sinTheta;
        const z = (sinA * p0[2] + sinB * p1[2]) / sinTheta;

        const latLon = unitVectorToLatLon(x, y, z);

        const elev =
            origin.elevation + f * (target.elevation - origin.elevation);

        points.push({
            label: `${losLabel} ${i}/${n}`,
            latitude: latLon[0],
            longitude: latLon[1],
            elevation: elev,
        });
    }

    return points;
}
