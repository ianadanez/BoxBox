import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

// This is a callable function that you will trigger manually once per season.
// It fetches the entire race schedule for a given year from the Ergast API and populates Firestore.
export const populateSeasonSchedule = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated, you might want to add role-based access control later.
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to perform this action.");
    }

    const year = data.year as string;
    if (!year || !/\d{4}/.test(year)) {
        throw new functions.https.HttpsError("invalid-argument", "A valid year must be provided.");
    }

    const db = admin.firestore();
    const seasonRef = db.collection("season").doc(year);

    functions.logger.info(`Fetching schedule for ${year}...`);

    try {
        const response = await axios.get(`https://ergast.com/api/f1/${year}.json`);
        const races = response.data.MRData.RaceTable.Races;

        if (!races || races.length === 0) {
            throw new functions.https.HttpsError("not-found", `No race data found for the ${year} season.`);
        }

        const batch = db.batch();

        // Create the season document to ensure it exists
        batch.set(seasonRef, { year: parseInt(year) });

        races.forEach((race: any) => {
            const raceDocRef = seasonRef.collection("races").doc(race.round);
            const raceData = {
                round: parseInt(race.round),
                raceName: race.raceName,
                circuitName: race.Circuit.circuitName,
                country: race.Circuit.Location.country,
                date: race.date, // Keep as ISO string
                time: race.time || "", // Ergast sometimes omits the time
                url: race.url,
                // We initialize the results as null to indicate they haven't been fetched yet.
                results: null 
            };
            batch.set(raceDocRef, raceData);
        });

        await batch.commit();

        const message = `Successfully populated ${races.length} races for the ${year} season.`;
        functions.logger.info(message);
        return { status: "success", message };

    } catch (error) {
        functions.logger.error(`Error populating schedule for ${year}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error; // Re-throw HttpsError directly
        }
        throw new functions.https.HttpsError("internal", "Failed to fetch or save season schedule.", error);
    }
});
