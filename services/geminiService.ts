import { GoogleGenAI, Type } from "@google/genai";
import { Driver, GrandPrix, Result } from "../types";

const getApiKey = (): string => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        // In a real app, you'd handle this more gracefully.
        // For this project, we'll alert and throw an error.
        const errorMsg = "La clave de API para el servicio de IA no está configurada. Contacta al administrador.";
        alert(errorMsg);
        throw new Error(errorMsg);
    }
    return apiKey;
};


const fetchDraftResults = async (gp: GrandPrix, drivers: Driver[]): Promise<Result | null> => {
    try {
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

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
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
    } catch (error: any) {
        console.error("Error calling Gemini API for draft results:", error);
        const errorMessage = error.message || "Un error desconocido ocurrió al contactar el servicio de IA.";
        alert(`No se pudieron obtener los resultados automáticos: ${errorMessage}`);
        return null;
    }
};

const fetchSchedule = async (year: number): Promise<GrandPrix[] | null> => {
     try {
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
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
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
    } catch (error: any) {
        console.error("Error calling Gemini API for schedule:", error);
        const errorMessage = error.message || "Un error desconocido ocurrió al contactar el servicio de IA.";
        alert(`No se pudo cargar el calendario automáticamente: ${errorMessage}`);
        return null;
    }
};

export const geminiService = {
  fetchDraftResults,
  fetchSchedule,
};