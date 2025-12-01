"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.populateSeasonSchedule = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
// This is a callable function that you will trigger manually once per season.
// It fetches the entire race schedule for a given year from the Ergast API and populates Firestore.
exports.populateSeasonSchedule = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated, you might want to add role-based access control later.
    if (!context || !context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to perform this action.");
    }
    const year = data.year;
    if (!year || !/\d{4}/.test(year)) {
        throw new functions.https.HttpsError("invalid-argument", "A valid year must be provided.");
    }
    const db = admin.firestore();
    const seasonRef = db.collection("seasons").doc(year);
    functions.logger.info(`Fetching schedule for ${year}...`);
    try {
        const response = await axios_1.default.get(`https://ergast.com/api/f1/${year}.json`);
        const races = response.data.MRData.RaceTable.Races;
        if (!races || races.length === 0) {
            throw new functions.https.HttpsError("not-found", `No race data found for the ${year} season.`);
        }
        const batch = db.batch();
        // Create the season document to ensure it exists
        batch.set(seasonRef, { year: parseInt(year) });
        races.forEach((race) => {
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
    }
    catch (error) {
        functions.logger.error(`Error populating schedule for ${year}:`, error);
        if (error instanceof functions.https.HttpsError) {
            throw error; // Re-throw HttpsError directly
        }
        throw new functions.https.HttpsError("internal", "Failed to fetch or save season schedule.", error);
    }
});
//# sourceMappingURL=populateSeasonSchedule.js.map