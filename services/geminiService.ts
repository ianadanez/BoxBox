import { httpsCallable } from "@firebase/functions";
import { functions } from "../firebaseConfig";
import { Driver, GrandPrix, Result } from "../types";


const fetchDraftResultsFn = httpsCallable<
    { gp: GrandPrix, drivers: Driver[] },
    Result
>(functions, 'fetchDraftResults');

const fetchScheduleFn = httpsCallable<
    { year: number },
    GrandPrix[]
>(functions, 'fetchSchedule');


const fetchDraftResults = async (gp: GrandPrix, drivers: Driver[]): Promise<Result | null> => {
    try {
        const response = await fetchDraftResultsFn({ gp, drivers });
        return response.data;
    } catch (error: any) {
        console.error("Error calling fetchDraftResults cloud function:", error);
        const errorMessage = error.message || "Un error desconocido ocurrió al contactar el servicio de IA.";
        alert(`No se pudieron obtener los resultados automáticos: ${errorMessage}`);
        return null;
    }
};

const fetchSchedule = async (year: number): Promise<GrandPrix[] | null> => {
     try {
        const response = await fetchScheduleFn({ year });
        return response.data;
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
