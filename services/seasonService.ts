
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreDb } from '../firebaseConfig';

/**
 * FOR DEBUGGING: Fetches all season documents from the database.
 * @returns {Promise<any[]>} A promise that resolves to an array of season data.
 */
export const debugGetAllSeasons = async (): Promise<any[]> => {
  console.log('DEBUG: Fetching all seasons...');
  const seasonsCollection = collection(firestoreDb, 'seasons');
  try {
    const querySnapshot = await getDocs(seasonsCollection);
    const seasons = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('DEBUG: All seasons found:', seasons);
    return seasons;
  } catch (error) {
    console.error("DEBUG: Error fetching all seasons:", error);
    return [];
  }
};

/**
 * Determines if the current date falls outside of any active season.
 * @returns {Promise<boolean>} A promise that resolves to true if it is off-season, false otherwise.
 */
export const checkIsOffSeason = async (): Promise<boolean> => {
  console.log('Checking season status...');
  const today = new Date().toISOString().split('T')[0]; // Get date in YYYY-MM-DD format

  const seasonsCollection = collection(firestoreDb, 'seasons');
  
  // Query for any season that is currently active
  const q = query(
    seasonsCollection,
    where('startDate', '<=', today),
    where('endDate', '>=', today),
    where('status', '==', 'active')
  );

  try {
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // No active season found for the current date.
      console.log('No active season found. It is currently OFF-SEASON.');
      return true; // It is off-season
    } else {
      // An active season was found.
      const season = querySnapshot.docs[0].id;
      console.log(`Active season found: ${season}. It is currently IN-SEASON.`);
      return false; // It is in-season
    }
  } catch (error) {
    console.error("Error checking season status:", error);
    // As a safe fallback, we'll assume it's in-season to not block users.
    return false; 
  }
};
