import dotenv from "dotenv";
import minimist from "minimist";
import z from "zod";
import { readConfig } from "./util/configs";
import { getDailySunriseSunset, getHourlyForecasts } from "./forecasts/fetch";
import { scoreLineOfSightForecast } from "./forecasts/score";
import { computeAzimuth } from "./calc/azimuth";
import { sendGmailNotification } from "./util/email";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: __dirname + "/../.env", quiet: true });

async function scoreForecasts() {
    try {
        const argv = minimist(process.argv.slice(2), {
            string: ["config", "days", "notifyAtThreshold", "asAtDate"],
            boolean: ["dawnDuskOnly"],
            default: {
                config: "config",
                days: 3,
                dawnDuskOnly: true,
            },
        });

        const argsSchema = z.object({
            config: z.string().nonempty(),
            days: z.coerce.number().gte(1).lte(14),
            notifyAtThreshold: z.coerce.number().gte(1).lte(100).optional(),
            asAtDate: z.iso.date().optional(),
            dawnDuskOnly: z.boolean(),
        });

        const args = argsSchema.parse(argv);
        const config = await readConfig(args.config);

        console.log("Fetching forecasts...");

        const sunriseSunsetPairs = await getDailySunriseSunset(
            args.days,
            config.origin.latitude,
            config.origin.longitude,
            config.timezone,
            args.asAtDate
        );

        const [originForecasts, targetForecasts] = await Promise.all([
            getHourlyForecasts(
                args.days,
                config.origin.latitude,
                config.origin.longitude,
                config.timezone,
                args.asAtDate
            ),
            getHourlyForecasts(
                args.days,
                config.target.latitude,
                config.target.longitude,
                config.timezone,
                args.asAtDate
            ),
        ]);
        const pointForecasts = config.points
            ? await Promise.all(
                  config.points.map(
                      async (point) =>
                          await getHourlyForecasts(
                              args.days,
                              point.latitude,
                              point.longitude,
                              config.timezone,
                              args.asAtDate
                          )
                  )
              )
            : [];

        let reachedThreshold = false;
        let output = "";
        for (let i = 0; i < originForecasts.length; i++) {
            const originForecast = originForecasts[i];
            const date = originForecast.dateTime;

            const dateString = date.format("YYYY-MM-DD");
            const pair = sunriseSunsetPairs[dateString];
            if (args.dawnDuskOnly) {
                if (
                    !(
                        (date.isAfter(pair.sunsetMin) &&
                            date.isBefore(pair.sunriseMax)) ||
                        (date.isAfter(pair.sunsetMin) &&
                            date.isBefore(pair.sunsetMax))
                    )
                ) {
                    continue;
                }
            } else {
                if (
                    date.isBefore(pair.sunriseMin) ||
                    date.isAfter(pair.sunsetMax)
                ) {
                    continue;
                }
            }

            const result = scoreLineOfSightForecast(
                {
                    dateTime: originForecast.dateTime,
                    originForecast,
                    targetForecast: targetForecasts[i],
                    pointForecasts: pointForecasts.map(
                        (forecasts) => forecasts[i]
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
                config.scoring
            );

            if (result.score >= (args.notifyAtThreshold ?? 50)) {
                reachedThreshold = true;
                output += "[*] ";
            } else {
                output += "[x] ";
            }

            const formattedDate = date.format("HH:mm ddd DD MMM");
            output += `${formattedDate} scores ${result.score} (${result.note})\n`;
        }

        console.log(output);

        if (args.notifyAtThreshold && !args.asAtDate && reachedThreshold) {
            console.log("Sending notification email...");
            await sendGmailNotification(
                output,
                `${config.origin.label} to ${config.target.label}: Upcoming forecasts have scored >=${args.notifyAtThreshold}`
            );
        }
    } catch (error) {
        console.error("[Score Forecasts]", error);
        process.exitCode = 1;
    }
}

scoreForecasts();
