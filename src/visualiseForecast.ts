import dotenv from "dotenv";
import minimist from "minimist";
import z from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { readConfig } from "./util/configs";
import { getHourlyForecasts } from "./forecasts/fetch";
import { visualiseLineOfSight } from "./forecasts/visualise";
import { computeAzimuth } from "./calc/azimuth";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defaultScoringConfig } from "./forecasts/score";

dayjs.extend(utc);
dayjs.extend(timezone);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: __dirname + "/../.env", quiet: true });

async function visualiseForecast() {
    try {
        const argv = minimist(process.argv.slice(2), {
            string: ["config", "time"],
            default: {
                config: "config",
            },
        });

        const argsSchema = z.object({
            config: z.string().nonempty(),
            time: z.string().nonempty(),
        });

        const args = argsSchema.parse(argv);
        const config = await readConfig(args.config);

        if ((config.points?.length || 0) > 4) {
            throw new Error(
                "Too many points to visualise. Please use a config with fewer points."
            );
        }

        const targetTime = dayjs.tz(args.time, config.timezone);
        if (!targetTime.isValid()) {
            throw new Error(
                "Invalid time format. Please provide a valid ISO string, e.g. 2026-03-22T19:00"
            );
        }

        const now = dayjs.tz(new Date(), config.timezone).startOf("day");
        const isHistorical = targetTime.isBefore(now, "day");
        const asAtDate = isHistorical
            ? targetTime.format("YYYY-MM-DD")
            : undefined;
        const fetchDays = isHistorical
            ? 1
            : Math.max(
                  1,
                  Math.min(7, targetTime.startOf("day").diff(now, "day") + 1)
              );

        console.log(
            `Fetching ${fetchDays} day(s) of forecasts for ${targetTime.format("YYYY-MM-DD HH:mm")} (${config.timezone})...`
        );

        const [originForecasts, targetForecasts] = await Promise.all([
            getHourlyForecasts(
                fetchDays,
                config.origin.latitude,
                config.origin.longitude,
                config.timezone,
                asAtDate
            ),
            getHourlyForecasts(
                fetchDays,
                config.target.latitude,
                config.target.longitude,
                config.timezone,
                asAtDate
            ),
        ]);
        const pointForecasts = config.points
            ? await Promise.all(
                  config.points.map(
                      async (point) =>
                          await getHourlyForecasts(
                              fetchDays,
                              point.latitude,
                              point.longitude,
                              config.timezone,
                              asAtDate
                          )
                  )
              )
            : [];

        let index = originForecasts.findIndex((f) =>
            f.dateTime.isSame(targetTime, "hour")
        );
        if (index === -1) {
            throw new Error(
                `Could not find the requested time ${targetTime.format("YYYY-MM-DD HH:mm")} in the fetched forecasts. Ensure it is within 7 days or use the exact correct hour/timezone.`
            );
        }

        const resultStr = visualiseLineOfSight(
            {
                dateTime: originForecasts[index].dateTime,
                originForecast: originForecasts[index],
                targetForecast: targetForecasts[index],
                pointForecasts: pointForecasts.map(
                    (forecasts) => forecasts[index]
                ),
                azimuthDegrees: computeAzimuth(
                    config.origin.latitude,
                    config.origin.longitude,
                    config.target.latitude,
                    config.target.longitude
                ),
            },
            config.origin.elevation,
            config.target.elevation,
            config.points ? config.points.map((p) => p.elevation) : [],
            defaultScoringConfig
        );

        console.log(
            `\nTime: ${targetTime.format("HH:mm ddd DD MMM YYYY")} (${config.timezone})\n`
        );
        console.log(resultStr);
    } catch (error) {
        console.error(
            "[Visualise Forecast]",
            error instanceof Error ? error.message : error
        );
        process.exitCode = 1;
    }
}

visualiseForecast();
