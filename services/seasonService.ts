
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreDb } from '../firebaseConfig';

// Keep a cached version of the active season to avoid repeated Firestore queries
// within the same user session.
let activeSeasonCache: string | null = null;

/**
 * Gets the ID of the currently active season.
 * It queries the 'seasons' collection for a document with status 'active'
 * and where the current date is within the season's start and end dates.
 * Results are cached for the session to improve performance.
 * @returns {Promise<string | null>} A promise that resolves to the active season ID (e.g., "2025") or null if none is active.
 */
export const getActiveSeason = async (): Promise<string | null> => {
  // Return the cached value if available
  if (activeSeasonCache) {
    console.log(`Returning cached active season: ${activeSeasonCache}`);
    return activeSeasonCache;
  }

  console.log('Querying for active season...');
  const today = new Date().toISOString().split('T')[0]; // Get date in YYYY-MM-DD format

  const seasonsCollection = collection(firestoreDb, 'seasons');
  const q = query(
    seasonsCollection,
    where('startDate', '<=', today),
    where('endDate', '>=', today),
    where('status', '==', 'active')
  );

  try {
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn('No active season found for the current date.');
      return null;
    } else {
      // It's possible to have more than one active season if data is not clean,
      // but we'll take the first one.
      const seasonDoc = querySnapshot.docs[0];
      const seasonId = seasonDoc.id;
      console.log(`Active season found: ${seasonId}.`);
      
      // Cache the result
      activeSeasonCache = seasonId;
      return seasonId;
    }
  } catch (error) {
    console.error("Error fetching active season:", error);
    // In case of error, we return null and don't block the app.
    return null;
  }
};


/**
 * Determines if the current date falls outside of any active season.
 * @returns {Promise<boolean>} A promise that resolves to true if it is off-season, false otherwise.
 */
export const checkIsOffSeason = async (): Promise<boolean> => {
  const seasonId = await getActiveSeason();
  // If getActiveSeason returns null, it's off-season. Otherwise, it's in-season.
  const isOffSeason = seasonId === null;
  console.log(`checkIsOffSeason result: ${isOffSeason}`);
  return isOffSeason;
};
