
import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from './firebaseConfig';

/**
 * Executes a one-time migration to create the 'seasons' collection
 * and the document for the current season if it doesn't exist.
 */
export const runTempMigration = async () => {
  // A flag on the window object to ensure this script runs only once per session.
  if ((window as any).tempMigrationHasRun) {
    console.log('Temporary migration has already been attempted this session.');
    return;
  }
  (window as any).tempMigrationHasRun = true;

  try {
    console.log('Running one-time temporary season migration...');
    
    // Reference to the '2025' document in the 'seasons' collection
    const seasonDocRef = doc(firestoreDb, 'seasons', '2025');

    // Data for the season
    const seasonData = {
      startDate: '2025-03-01',
      endDate: '2025-12-07',
      status: 'active'
    };

    // Create the document
    await setDoc(seasonDocRef, seasonData);
    
    console.log('SUCCESS: Temporary migration complete. Document "2025" created in "seasons" collection.');

  } catch (error) {
    console.error('ERROR during temporary migration:', error);
  }
};
