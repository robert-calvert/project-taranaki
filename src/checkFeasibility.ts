import { readConfig } from "./util/configs";
import { calculateVisibleTargetHeight } from "./calc/visibility";
import minimist from "minimist";
import z from "zod";
import { DEFAULT_REFRACTION, refractionArgumentSchema } from "./types/config";

async function checkFeasibility() {
    try {
        const argv = minimist(process.argv.slice(2), {
            string: ["config", "refraction"],
            default: {
                config: "config",
                refraction: DEFAULT_REFRACTION,
            },
        });

        const argsSchema = z.object({
            config: z.string().nonempty(),
            refraction: refractionArgumentSchema,
        });

        const args = argsSchema.parse(argv);
        const config = await readConfig(args.config);

        console.log(
            `Determining feasibility with a terrestrial refraction factor of ${args.refraction}...`
        );

        const result = calculateVisibleTargetHeight(
            config.origin,
            config.target,
            args.refraction
        );

        const targetName = config.target.label ?? "The target";
        const originName = config.origin.label ?? "the origin";
        const visibleHeight = result.visibleHeightMetres;
        if (visibleHeight > 0) {
            console.log(
                `${targetName} is visible from ${originName}! It's a distance of ${(result.distanceMetres / 1000).toFixed(2)}km.`
            );
            console.log(
                `You may be able to see up to ${visibleHeight.toFixed(1)}m of it above the horizon, or ${(result.visibleFraction * 100).toFixed(1)}% of its total elevation.`
            );

            const angularHeight = result.angularHeightDegrees;
            if (angularHeight < 0.05) {
                console.log(
                    `However, with an angular height of only ${angularHeight.toFixed(2)}°, you will need exceptionally clear air and ideal lighting to see it.`
                );
            } else if (angularHeight < 0.1) {
                console.log(
                    `With an angular height of ${angularHeight.toFixed(2)}°, it may be hard to make out in hazy or humid conditions.`
                );
            }
        } else {
            console.log(`${targetName} is NOT visible from ${originName}.`);
        }
    } catch (error) {
        console.error("[Line of Sight Feasibility]", error);
        process.exitCode = 1;
    }
}

checkFeasibility();
