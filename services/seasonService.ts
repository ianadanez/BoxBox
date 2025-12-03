
import { firestore } from '../firebaseConfig'; // Assuming compat

let activeSeasonId: string | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

/**
 * Gets the active season ID, using a short-lived cache to reduce Firestore reads.
 * This is crucial for performance as it's called by almost every data-fetching function.
 */
export const getActiveSeason = async (): Promise<string | null> => {
    const now = Date.now();
    if (activeSeasonId && (now - lastFetchTime < CACHE_DURATION)) {
        return activeSeasonId;
    }

    console.log("Fetching active season from Firestore...");
    const q = firestore.collection('seasons').where('isActive', '==', true).limit(1);
    const snapshot = await q.get();
    
    if (snapshot.empty) {
        console.warn("No active season found in 'seasons' collection.");
        activeSeasonId = null;
    } else {
        activeSeasonId = snapshot.docs[0].id;
        console.log(`Active season set to: ${activeSeasonId}`);
    }
    
    lastFetchTime = now;
    return activeSeasonId;
};

/**
 * Clears the cached active season ID.
 * This should be called after an operation that changes the active season.
 */
export const clearActiveSeasonCache = (): void => {
    console.log("Active season cache cleared.");
    activeSeasonId = null;
    lastFetchTime = 0;
};
