
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreDb } from '../firebaseConfig';

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
