
import { firestore } from '../firebaseConfig'; // Assuming compat

let activeSeasonId: string | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes
let activeSeasonUnsubscribe: (() => void) | null = null;

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
    // FIX: Changed the query to match the database schema (`status: "active"` instead of `isActive: true`).
    const q = firestore.collection('seasons').where('status', '==', 'active').limit(1);
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
    if (activeSeasonUnsubscribe) {
        activeSeasonUnsubscribe();
        activeSeasonUnsubscribe = null;
    }
    console.log("Active season cache cleared.");
    activeSeasonId = null;
    lastFetchTime = 0;
};

/**
 * Checks if the application is currently in an "off-season" state.
 * @returns {Promise<boolean>} True if no active season is found, false otherwise.
 */
export const checkIsOffSeason = async (): Promise<boolean> => {
    const seasonId = await getActiveSeason();
    return seasonId === null;
};

/**
 * Listen to changes in the active season and invoke the callback with the current active season ID (or null).
 * Returns an unsubscribe function.
 */
export const listenToActiveSeason = (onChange: (seasonId: string | null) => void): (() => void) => {
    // Avoid multiple listeners at once.
    if (activeSeasonUnsubscribe) {
        activeSeasonUnsubscribe();
        activeSeasonUnsubscribe = null;
    }

    const q = firestore.collection('seasons').where('status', '==', 'active').limit(1);
    activeSeasonUnsubscribe = q.onSnapshot(snapshot => {
        if (snapshot.empty) {
            activeSeasonId = null;
        } else {
            activeSeasonId = snapshot.docs[0].id;
        }
        lastFetchTime = Date.now();
        onChange(activeSeasonId);
    }, err => {
        console.error("Error listening to active season:", err);
        onChange(activeSeasonId);
    });

    return () => {
        if (activeSeasonUnsubscribe) {
            activeSeasonUnsubscribe();
            activeSeasonUnsubscribe = null;
        }
    };
};

/**
 * Returns the most recent inactive season id to be used for off-season summaries.
 * Preference: latest endDate; fallback: highest numeric id; else last by id.
 */
export const getLastInactiveSeasonId = async (): Promise<string | null> => {
    const snapshot = await firestore.collection('seasons').get();
    if (snapshot.empty) return null;

    const seasons = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
            id: doc.id,
            status: data.status,
            endDate: data.endDate as string | undefined,
        };
    });

    const inactive = seasons.filter(s => s.status !== 'active');
    if (inactive.length === 0) return null;

    const parseDate = (value?: string) => {
        if (!value) return 0;
        const t = Date.parse(value);
        return isNaN(t) ? 0 : t;
    };

    inactive.sort((a, b) => {
        const ad = parseDate(a.endDate);
        const bd = parseDate(b.endDate);
        if (ad !== bd) return bd - ad;

        const ai = parseInt(a.id, 10);
        const bi = parseInt(b.id, 10);
        if (!isNaN(ai) && !isNaN(bi) && ai !== bi) return bi - ai;

        return b.id.localeCompare(a.id);
    });

    return inactive[0].id;
};
