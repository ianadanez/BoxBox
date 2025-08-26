
import { GrandPrix, Result, Driver } from "../types";
import { functions } from '../firebaseConfig';

const fetchDraftResultsCallable = functions.httpsCallable('fetchDraftResults');

const fetchScheduleCallable = functions.httpsCallable('fetchSchedule');


const fetchDraftResults = async (gp: GrandPrix, drivers: Driver[]): Promise<Result | null> => {
    try {
        const result = await fetchDraftResultsCallable({ gp, drivers });
        return result.data;
    } catch (error: any) {
        console.error("Error calling fetchDraftResults cloud function:", error);
        const errorMessage = error.message || "Un error desconocido ocurrió al contactar el servicio de IA.";
        alert(`No se pudieron obtener los resultados automáticos: ${errorMessage}`);
        return null;
    }
};

const fetchSchedule = async (year: number): Promise<GrandPrix[] | null> => {
    try {
        const result = await fetchScheduleCallable({ year });
        return result.data;
    } catch (error: any) {
        console.error("Error calling fetchSchedule cloud function:", error);
        const errorMessage = error.message || "Un error desconocido ocurrió al contactar el servicio de IA.";
        alert(`No se pudo cargar el calendario automáticamente: ${errorMessage}`);
        return null;
    }
};

export const geminiService = {
  fetchDraftResults,
  fetchSchedule,
};
