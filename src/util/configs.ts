import { promises as fs } from "fs";
import path from "path";
import { ZodType } from "zod";
import { LineOfSightConfig, lineOfSightConfigSchema } from "../types/config";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

async function readJsonFile<T>(
    path: string,
    validationSchema: ZodType<T>
): Promise<T> {
    const raw = await fs.readFile(path, "utf8");
    return validationSchema.parse(JSON.parse(raw));
}

async function writeJsonFile(
    path: string,
    data: unknown,
    pretty = true
): Promise<void> {
    const json = JSON.stringify(data, null, pretty ? 2 : 0) + "\n";
    await fs.writeFile(path, json, "utf8");
}

function getConfigPath(filename: string): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const rootDir = path.resolve(__dirname, "../..");
    return path.join(rootDir, `${filename}.json`);
}

export async function readConfig(name: string): Promise<LineOfSightConfig> {
    const configPath = getConfigPath(name);
    return await readJsonFile(configPath, lineOfSightConfigSchema);
}

export async function saveConfig(
    name: string,
    config: LineOfSightConfig
): Promise<void> {
    const configPath = getConfigPath(name);
    await writeJsonFile(configPath, config);
}
