import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { z, ZodError, ZodType } from "zod";
import https from "node:https";

const REQUEST_TIMEOUT_MILLIS = 15000;
const RETRY_DELAY_MILLIS = 5000;

const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 5,
    timeout: REQUEST_TIMEOUT_MILLIS,
    family: 4, // Force IPv4
});

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(
    config: AxiosRequestConfig,
    retries: number = 2
): Promise<AxiosResponse> {
    const configUsingAgent: AxiosRequestConfig = {
        httpsAgent,
        ...config,
    };

    let attempt = 0;
    while (true) {
        try {
            const response = await axios.request(configUsingAgent);

            if (response.status >= 500 && attempt < retries) {
                attempt++;
                await sleep(RETRY_DELAY_MILLIS);
                continue;
            }

            return response;
        } catch (error: unknown) {
            attempt++;

            console.error(
                "requestWithRetry",
                new Date().toLocaleString("en-GB")
            );
            console.error(
                "Request Config:",
                JSON.stringify(configUsingAgent, null, 2)
            );

            if (axios.isAxiosError(error)) {
                const code = error.code;

                console.error("Axios Code:", code);
                console.error("Axios Message:", error.message);
                console.error("Axios Cause:", error.cause);
                console.error(
                    "Axios Response:",
                    error.response?.status,
                    error.response?.data
                );

                const isTransient =
                    code === "ECONNRESET" ||
                    code === "EAI_AGAIN" ||
                    code === "ETIMEDOUT" ||
                    code === "ECONNREFUSED" ||
                    (error.response && error.response.status >= 500);
                if (attempt <= retries && isTransient) {
                    await sleep(RETRY_DELAY_MILLIS);
                    continue;
                }

                throw new Error(
                    error.response?.data
                        ? JSON.stringify(error.response.data)
                        : `Axios Error: ${error.message} (${error.code})`
                );
            }

            throw error;
        }
    }
}

async function handleAxiosResponse<T>(
    response: AxiosResponse,
    validationSchema: ZodType<T>
): Promise<T> {
    try {
        const responseBody = validationSchema.parse(response.data);
        return responseBody;
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            throw new Error(z.prettifyError(error));
        }

        throw error;
    }
}

export async function apiGet<T>(
    requestUrl: string,
    validationSchema: ZodType<T>,
    headers?: Record<string, string>
): Promise<T> {
    return handleAxiosResponse(
        await requestWithRetry({
            method: "GET",
            url: requestUrl,
            headers,
            timeout: REQUEST_TIMEOUT_MILLIS,
        }),
        validationSchema
    );
}
