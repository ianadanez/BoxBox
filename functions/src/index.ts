
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {GoogleGenAI, Type} from "@google/genai";
import {Driver, GrandPrix, Result} from "../../types";

admin.initializeApp();

const getApiKey = () => {
    try {
        return functions.config().gemini.key;
    } catch (error) {
        functions.logger.error(
            "FATAL: Could not get Gemini API key from function config.",
            "Run 'firebase functions:config:set gemini.key=\"YOUR_API_KEY\"'",
        );
        throw new functions.https.HttpsError(
            "internal",
            "API key not configured."
        );
    }
};


export const fetchDraftResults = functions.https.onCall(
    async (request: functions.https.CallableRequest<{gp: GrandPrix, drivers: Driver[]}>) => {
        if (!request.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "The function must be called while authenticated."
            );
        }
        const {gp, drivers} = request.data;
        const ai = new GoogleGenAI({apiKey: getApiKey()});

        const activeDriverIds = drivers.filter((d) => d.isActive).map((d) => d.id);
        const prompt = `
            Generate the results for the Formula 1 ${gp.name}.
            The event took place at the ${gp.track} in ${gp.country}.
            Provide results for Pole Position, Race Podium (P1, P2, P3),
            Fastest Lap, and Driver of the Day.
            ${gp.hasSprint ?
            "Also include results for Sprint Pole and Sprint Podium (P1, P2, P3)."
            : ""}
            Use ONLY the following valid driver IDs in your response:
            ${activeDriverIds.join(", ")}.
            Do not invent new driver IDs. The response must be a valid JSON object.
        `;
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                pole: {type: Type.STRING, description: "Driver ID for Pole Position."},
                sprintPole: gp.hasSprint ?
                    {type: Type.STRING, description: "Driver ID for Sprint Pole."} :
                    undefined,
                sprintPodium: gp.hasSprint ? {
                    type: Type.ARRAY,
                    description: "An array of 3 driver IDs for the Sprint podium.",
                    items: {type: Type.STRING},
                    minItems: 3,
                    maxItems: 3,
                } : undefined,
                racePodium: {
                    type: Type.ARRAY,
                    description: "An array of 3 driver IDs for the Race podium.",
                    items: {type: Type.STRING},
                    minItems: 3,
                    maxItems: 3,
                },
                fastestLap: {type: Type.STRING, description: "Driver ID for Fastest Lap."},
                driverOfTheDay: {type: Type.STRING, description: "Driver ID for Driver of the Day."},
            },
            required: ["pole", "racePodium", "fastestLap", "driverOfTheDay"]
                .concat(gp.hasSprint ? ["sprintPole", "sprintPodium"] : []),
        };

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    responseSchema: responseSchema,
                },
            });
            const text = response.text.trim();
            const parsedResult = JSON.parse(text);

            const finalResult: Result = {
                gpId: gp.id,
                pole: parsedResult.pole,
                racePodium: parsedResult.racePodium,
                fastestLap: parsedResult.fastestLap,
                driverOfTheDay: parsedResult.driverOfTheDay,
                ...(gp.hasSprint && {
                    sprintPole: parsedResult.sprintPole,
                    sprintPodium: parsedResult.sprintPodium,
                }),
            };
            return finalResult;
        } catch (error) {
            functions.logger.error("Error fetching draft results from Gemini API:", error);
            throw new functions.https.HttpsError(
                "internal",
                "Failed to fetch results from AI."
            );
        }
    }
);

export const fetchSchedule = functions.https.onCall(
    async (request: functions.https.CallableRequest<{year: number}>) => {
        if (!request.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "The function must be called while authenticated."
            );
        }
        const {year} = request.data;
        const ai = new GoogleGenAI({apiKey: getApiKey()});

        const prompt = `
            Generate the complete Formula 1 calendar for the ${year} season.
            For each Grand Prix, provide its official name, country, track name,
            and whether it has a Sprint race.
            Provide the exact official UTC date and time for qualification and the race.
            If it has a sprint, provide the UTC date and time for the sprint race too.
            Format dates as ISO 8601 strings (YYYY-MM-DDTHH:mm:ssZ).
            The response must be a valid JSON array.
        `;

        const responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: {type: Type.STRING, description: "Official GP Name"},
                    country: {type: Type.STRING},
                    track: {type: Type.STRING},
                    hasSprint: {type: Type.BOOLEAN},
                    events: {
                        type: Type.OBJECT,
                        properties: {
                            quali: {type: Type.STRING, description: "ISO 8601 UTC Datetime"},
                            race: {type: Type.STRING, description: "ISO 8601 UTC Datetime"},
                            sprint: {type: Type.STRING, description: "ISO 8601 UTC Datetime, if applicable"},
                        },
                        required: ["quali", "race"],
                    },
                },
                required: ["name", "country", "track", "hasSprint", "events"],
            },
        };

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    responseSchema: responseSchema,
                },
            });

            const text = response.text.trim();
            const parsedSchedule = JSON.parse(text);

            return parsedSchedule.map((gp: any, index: number) => ({
                id: index + 1, // Assign a simple numeric ID
                ...gp,
            }));
        } catch (error) {
            functions.logger.error("Error fetching schedule from Gemini API:", error);
            throw new functions.https.HttpsError(
                "internal",
                "Failed to fetch schedule from AI."
            );
        }
    }
);
