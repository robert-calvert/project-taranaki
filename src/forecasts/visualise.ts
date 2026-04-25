import { LineOfSightForecast, PointForecast } from "../types/forecast";
import { ScoringConfig } from "../types/config";

type Alignment = "left" | "centre" | "right";

const MAX_ELEVATION_METRES = 4000;
const MID_CLOUD_ELEVATION_METRES = 3000;
const LOW_CLOUD_ELEVATION_METRES = 1000;
const GRID_ROW_COUNT = 18;
const GRID_WIDTH = 125;

const ORIGIN_TARGET_LABEL_OFFSET = 2;
const PEAK_MARKER_MIN_ELEVATION_METRES = 1000;

const ELEVATION_AXIS_TITLE = "Elevation";
const LOW_CLOUD_AXIS_LABEL = "Low Cloud";
const MID_CLOUD_AXIS_LABEL = "Mid Cloud";
const PRECIPITATION_LABEL = "Precipitation";
const TOTAL_CLOUD_LABEL = "Total Cloud";
const VISIBILITY_LABEL = "Visibility";
const WIND_SPEED_LABEL = "Wind Speed";
const LIFTED_INDEX_LABEL = "Lifted Index";
const DEW_POINT_SPREAD_LABEL = "Dew Point Spread";
const HAZE_AOD_LABEL = "Air Quality (AOD)";

const AXIS_LABEL_WIDTH = 18;
const AXIS_DIVIDER = " | ";
const BLANK_AXIS_LABEL = "";
const MISSING_VALUE_DEFAULT = "nil";

const ELEVATION_TICK_VALUES = [MAX_ELEVATION_METRES, 2000, 0] as const;

function padAxisLabel(label: string): string {
    return label.padStart(AXIS_LABEL_WIDTH);
}

function formatAxisPrefix(label: string): string {
    return `${padAxisLabel(label)}${AXIS_DIVIDER}`;
}

function createBlankGridRow(): string {
    return " ".repeat(GRID_WIDTH);
}

function elevationToRow(elevationMetres: number): number {
    const clampedElevation = Math.min(
        MAX_ELEVATION_METRES,
        Math.max(0, elevationMetres)
    );

    return (
        GRID_ROW_COUNT -
        Math.round((clampedElevation / MAX_ELEVATION_METRES) * GRID_ROW_COUNT)
    );
}

function overlayText(
    baseLine: string,
    text: string,
    alignment: Alignment,
    anchorPosition: number
): string {
    let startIndex = anchorPosition;

    if (alignment === "centre") {
        startIndex = anchorPosition - Math.floor(text.length / 2);
    } else if (alignment === "right") {
        startIndex = anchorPosition - text.length;
    }

    startIndex = Math.max(0, startIndex);

    const characters = baseLine.split("");

    for (
        let characterIndex = 0;
        characterIndex < text.length;
        characterIndex++
    ) {
        const targetIndex = startIndex + characterIndex;

        if (targetIndex < characters.length) {
            characters[targetIndex] = text[characterIndex];
        } else {
            characters.push(text[characterIndex]);
        }
    }

    return characters.join("");
}

function getColumnPlacement(
    pointIndex: number,
    totalPoints: number,
    columnWidth: number
): { alignment: Alignment; anchorPosition: number; columnStart: number } {
    const columnStart = pointIndex * columnWidth;

    if (pointIndex === 0) {
        return {
            alignment: "left",
            anchorPosition: columnStart + ORIGIN_TARGET_LABEL_OFFSET,
            columnStart,
        };
    }

    if (pointIndex === totalPoints - 1) {
        return {
            alignment: "right",
            anchorPosition:
                columnStart + columnWidth - ORIGIN_TARGET_LABEL_OFFSET,
            columnStart,
        };
    }

    return {
        alignment: "centre",
        anchorPosition: columnStart + Math.floor(columnWidth / 2),
        columnStart,
    };
}

function isSpecialCloudRow(
    rowIndex: number,
    lowCloudRowIndex: number,
    midCloudRowIndex: number
): boolean {
    return rowIndex === lowCloudRowIndex || rowIndex === midCloudRowIndex;
}

function formatMetricRow(label: string, content: string): string {
    return `${padAxisLabel(label)}${AXIS_DIVIDER}${content.trimEnd()}\n`;
}

export function visualiseLineOfSight(
    forecast: LineOfSightForecast,
    originElevation: number,
    targetElevation: number,
    pointElevations: number[],
    scoring: Required<ScoringConfig>
): string {
    const pointData = [
        {
            forecast: forecast.originForecast,
            elevation: originElevation,
            label: "Origin",
        },
        ...forecast.pointForecasts.map((pointForecast, index) => ({
            forecast: pointForecast,
            elevation: pointElevations[index],
            label: `Point ${index + 1}`,
        })),
        {
            forecast: forecast.targetForecast,
            elevation: targetElevation,
            label: "Target",
        },
    ] satisfies {
        forecast: PointForecast;
        elevation: number;
        label: string;
    }[];

    const totalPoints = pointData.length;
    const columnWidth = Math.floor(GRID_WIDTH / totalPoints);

    const midCloudRowIndex = elevationToRow(MID_CLOUD_ELEVATION_METRES);
    const lowCloudRowIndex = elevationToRow(LOW_CLOUD_ELEVATION_METRES);

    const axisRowLabels = new Map<number, string>(
        ELEVATION_TICK_VALUES.map((elevationMetres) => [
            elevationToRow(elevationMetres),
            `${elevationMetres}m`,
        ])
    );

    axisRowLabels.set(midCloudRowIndex, MID_CLOUD_AXIS_LABEL);
    axisRowLabels.set(lowCloudRowIndex, LOW_CLOUD_AXIS_LABEL);

    const gridRows = Array.from(
        { length: GRID_ROW_COUNT + 1 },
        createBlankGridRow
    );

    for (let pointIndex = 0; pointIndex < totalPoints; pointIndex++) {
        const currentPoint = pointData[pointIndex];
        const { alignment, anchorPosition } = getColumnPlacement(
            pointIndex,
            totalPoints,
            columnWidth
        );

        let elevationRowIndex = elevationToRow(currentPoint.elevation);
        let boundaryLayerRowIndex = elevationToRow(
            currentPoint.forecast.boundaryLayerHeight
        );

        let elevationLabelText = "";

        if (pointIndex === 0 || pointIndex === totalPoints - 1) {
            if (
                isSpecialCloudRow(
                    elevationRowIndex,
                    lowCloudRowIndex,
                    midCloudRowIndex
                )
            ) {
                elevationRowIndex++;
            }

            elevationLabelText = `[ ${Math.round(currentPoint.elevation)}m ]`;
        }

        if (
            isSpecialCloudRow(
                boundaryLayerRowIndex,
                lowCloudRowIndex,
                midCloudRowIndex
            )
        ) {
            boundaryLayerRowIndex++;
        }

        if (
            elevationLabelText &&
            currentPoint.forecast.boundaryLayerHeight >
                currentPoint.elevation &&
            boundaryLayerRowIndex >= elevationRowIndex
        ) {
            boundaryLayerRowIndex = Math.max(0, elevationRowIndex - 1);
        } else if (
            elevationLabelText &&
            currentPoint.forecast.boundaryLayerHeight <
                currentPoint.elevation &&
            boundaryLayerRowIndex <= elevationRowIndex
        ) {
            boundaryLayerRowIndex = Math.min(
                GRID_ROW_COUNT,
                elevationRowIndex + 1
            );
        }

        if (
            isSpecialCloudRow(
                boundaryLayerRowIndex,
                lowCloudRowIndex,
                midCloudRowIndex
            )
        ) {
            boundaryLayerRowIndex--;
        }

        gridRows[midCloudRowIndex] = overlayText(
            gridRows[midCloudRowIndex],
            `${currentPoint.forecast.cloudCoverMid}%`,
            alignment,
            anchorPosition
        );

        gridRows[lowCloudRowIndex] = overlayText(
            gridRows[lowCloudRowIndex],
            `${currentPoint.forecast.cloudCoverLow}%`,
            alignment,
            anchorPosition
        );

        if (elevationLabelText) {
            gridRows[elevationRowIndex] = overlayText(
                gridRows[elevationRowIndex],
                elevationLabelText,
                alignment,
                anchorPosition
            );

            if (currentPoint.elevation >= PEAK_MARKER_MIN_ELEVATION_METRES) {
                let peakMarkerRowIndex = Math.max(0, elevationRowIndex - 1);

                if (
                    isSpecialCloudRow(
                        peakMarkerRowIndex,
                        lowCloudRowIndex,
                        midCloudRowIndex
                    )
                ) {
                    peakMarkerRowIndex--;
                }

                peakMarkerRowIndex = Math.max(0, peakMarkerRowIndex);

                gridRows[peakMarkerRowIndex] = overlayText(
                    gridRows[peakMarkerRowIndex],
                    "^",
                    alignment,
                    anchorPosition
                );
            }
        }

        gridRows[boundaryLayerRowIndex] = overlayText(
            gridRows[boundaryLayerRowIndex],
            `==== ${Math.round(currentPoint.forecast.boundaryLayerHeight)}m`,
            alignment,
            anchorPosition
        );
    }

    let output = `${ELEVATION_AXIS_TITLE}\n`;

    for (let rowIndex = 0; rowIndex <= GRID_ROW_COUNT; rowIndex++) {
        const axisLabel = axisRowLabels.get(rowIndex) ?? BLANK_AXIS_LABEL;
        output += `${formatAxisPrefix(axisLabel)}${gridRows[rowIndex].trimEnd()}\n`;
    }

    output += `\n${formatAxisPrefix(BLANK_AXIS_LABEL)}`;

    let pointLabelRow = createBlankGridRow();

    for (let pointIndex = 0; pointIndex < totalPoints; pointIndex++) {
        const currentPoint = pointData[pointIndex];
        const { alignment, anchorPosition } = getColumnPlacement(
            pointIndex,
            totalPoints,
            columnWidth
        );

        pointLabelRow = overlayText(
            pointLabelRow,
            currentPoint.label,
            alignment,
            anchorPosition
        );
    }

    output += `${pointLabelRow.trimEnd()}\n`;
    output += `${"-".repeat(GRID_WIDTH + AXIS_LABEL_WIDTH)}\n`;

    let precipitationContent = createBlankGridRow();
    let totalCloudContent = createBlankGridRow();
    let visibilityContent = createBlankGridRow();
    let windSpeedContent = createBlankGridRow();
    let liftedIndexContent = createBlankGridRow();
    let dewPointSpreadContent = createBlankGridRow();
    let hazeAodContent = createBlankGridRow();

    const hasReducedVisibility = pointData.some((currentPoint) => {
        const visibility = currentPoint.forecast.visibility;

        return visibility !== null && visibility < scoring.idealVisibility;
    });

    for (let pointIndex = 0; pointIndex < totalPoints; pointIndex++) {
        const currentPoint = pointData[pointIndex];
        const { alignment, anchorPosition } = getColumnPlacement(
            pointIndex,
            totalPoints,
            columnWidth
        );

        precipitationContent = overlayText(
            precipitationContent,
            `${currentPoint.forecast.precipitation.toFixed(1)}mm`,
            alignment,
            anchorPosition
        );

        totalCloudContent = overlayText(
            totalCloudContent,
            `${currentPoint.forecast.cloudCover}%`,
            alignment,
            anchorPosition
        );

        if (hasReducedVisibility) {
            const visibility = currentPoint.forecast.visibility;

            if (visibility !== null && visibility < scoring.idealVisibility) {
                visibilityContent = overlayText(
                    visibilityContent,
                    `~${Math.round(visibility / 1000)}km`,
                    alignment,
                    anchorPosition
                );
            }
        }

        windSpeedContent = overlayText(
            windSpeedContent,
            `${Math.round(currentPoint.forecast.windSpeed10m)}km/h`,
            alignment,
            anchorPosition
        );

        const liftedIndex = currentPoint.forecast.liftedIndex;

        liftedIndexContent = overlayText(
            liftedIndexContent,
            `${liftedIndex?.toFixed(2) ?? MISSING_VALUE_DEFAULT}`,
            alignment,
            anchorPosition
        );

        const dewPointSpread =
            currentPoint.forecast.temperature2m -
            currentPoint.forecast.dewPoint2m;

        dewPointSpreadContent = overlayText(
            dewPointSpreadContent,
            `${dewPointSpread.toFixed(1)}°`,
            alignment,
            anchorPosition
        );

        const aerosolOpticalDepth = currentPoint.forecast.aerosolOpticalDepth;

        hazeAodContent = overlayText(
            hazeAodContent,
            aerosolOpticalDepth?.toString() ?? MISSING_VALUE_DEFAULT,
            alignment,
            anchorPosition
        );
    }

    output += formatMetricRow(PRECIPITATION_LABEL, precipitationContent);
    output += formatMetricRow(TOTAL_CLOUD_LABEL, totalCloudContent);

    if (hasReducedVisibility) {
        output += formatMetricRow(VISIBILITY_LABEL, visibilityContent);
    }

    output += formatMetricRow(WIND_SPEED_LABEL, windSpeedContent);
    output += formatMetricRow(LIFTED_INDEX_LABEL, liftedIndexContent);
    output += formatMetricRow(DEW_POINT_SPREAD_LABEL, dewPointSpreadContent);
    output += formatMetricRow(HAZE_AOD_LABEL, hazeAodContent);

    return output;
}
