import * as functions from "firebase-functions";
import axios from "axios";
import { db } from "./firebase";

// This function will be called by a scheduler.
// It checks for the latest race results and saves them if they are not already present.
export const fetchAndSaveRaceResults = functions.https.onCall(async (data, context) => {
    try {
        // 1. Get the last race of the current season from Ergast API
        const lastRaceInfo = await axios.get("https://ergast.com/api/f1/current/last.json");
        const lastRace = lastRaceInfo.data.MRData.RaceTable.Races[0];
        const { season, round, raceName } = lastRace;

        functions.logger.info(`Last race was ${raceName}, season ${season}, round ${round}.`);

        // 2. Check if results for this race already exist in Firestore
        const raceRef = db.collection("season").doc(season).collection("races").doc(round);
        const raceDoc = await raceRef.get();

        if (raceDoc.exists && raceDoc.data()?.results) {
            functions.logger.info(`Results for ${raceName} already exist. Exiting.`);
            return { message: `Results for round ${round} already exist.` };
        }

        functions.logger.info(`No results found for ${raceName}. Fetching from Ergast...`);

        // 3. Fetch race results and qualifying results
        const [raceResults, qualifyingResults] = await Promise.all([
            axios.get(`https://ergast.com/api/f1/${season}/${round}/results.json`),
            axios.get(`https://ergast.com/api/f1/${season}/${round}/qualifying.json`)
        ]);

        // 4. Process and save the results
        const resultsData = raceResults.data.MRData.RaceTable.Races[0].Results;
        const qualifyingData = qualifyingResults.data.MRData.RaceTable.Races[0].QualifyingResults;
        
        const polePosition = qualifyingData.find((q: any) => q.position === "1")?.Driver.driverId;
        const fastestLap = resultsData.find((r: any) => r.FastestLap?.rank === "1")?.Driver.driverId;

        const resultsToSave = {
            p1: resultsData.find((r: any) => r.position === "1")?.Driver.driverId,
            p2: resultsData.find((r: any) => r.position === "2")?.Driver.driverId,
            p3: resultsData.find((r: any) => r.position === "3")?.Driver.driverId,
            p4: resultsData.find((r: any) => r.position === "4")?.Driver.driverId,
            p5: resultsData.find((r: any) => r.position === "5")?.Driver.driverId,
            p6: resultsData.find((r: any) => r.position === "6")?.Driver.driverId,
            p7: resultsData.find((r: any) => r.position === "7")?.Driver.driverId,
            p8: resultsData.find((r: any) => r.position === "8")?.Driver.driverId,
            p9: resultsData.find((r: any) => r.position === "9")?.Driver.driverId,
            p10: resultsData.find((r: any) => r.position === "10")?.Driver.driverId,
            pole: polePosition,
            fastestLap: fastestLap,
        };

        await raceRef.set({ name: raceName, round, season, results: resultsToSave }, { merge: true });

        functions.logger.info(`Successfully fetched and saved results for ${raceName}.`);
        return { message: `Successfully saved results for ${raceName}.`};

    } catch (error) {
        functions.logger.error("Error fetching or saving race results:", error);
        // We throw an error to signal to the caller (and Cloud Scheduler) that the function failed.
        throw new functions.https.HttpsError("internal", "Failed to process race results", error);
    }
});
