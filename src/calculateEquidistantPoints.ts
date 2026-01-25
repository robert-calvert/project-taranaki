import minimist from "minimist";
import { getEquidistantPointsOnGreatCircle } from "./calc/equidistant";
import { readConfig, saveConfig } from "./util/configs";
import z from "zod";

const DEFAULT_POINTS_TO_CALCULATE = 3;

async function calculateEquidistantPoints() {
    try {
        const argv = minimist(process.argv.slice(2), {
            string: ["config", "points"],
            default: {
                config: "config",
                points: DEFAULT_POINTS_TO_CALCULATE,
            },
        });

        const argsSchema = z.object({
            config: z.string().nonempty(),
            points: z.coerce.number().gte(1).lte(10),
        });

        const args = argsSchema.parse(argv);
        const configName = args.config;
        const config = await readConfig(configName);

        console.log(
            "Calculating equidistant points along the line of sight, this will override any existing points..."
        );

        config.points = getEquidistantPointsOnGreatCircle(
            config.origin,
            config.target,
            args.points
        );

        await saveConfig(configName, config);

        console.log(
            `Calculated and saved ${config.points.length} new equidistant points to ${configName}.json!`
        );
    } catch (error) {
        console.error("[Calculate Equidistant Points]", error);
        process.exitCode = 1;
    }
}

calculateEquidistantPoints();
