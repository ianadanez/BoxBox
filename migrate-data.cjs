
// Import the necessary Firebase modules.
const admin = require('firebase-admin');

// IMPORTANT: Ensure you have the 'serviceAccountKey.json' file in your project root.
const serviceAccount = require('./serviceAccountKey.json');

// --- Configuration ---
const COLLECTIONS_TO_MIGRATE = [
  'schedule',
  'results',
  'predictions',
  'tournaments',
  'pointAdjustments'
];
const TARGET_SEASON = '2025';
// -------------------

// Initialize the Firebase Admin SDK.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateData() {
  console.log(`Starting data migration for season ${TARGET_SEASON}...`);

  const seasonRef = db.collection('seasons').doc(TARGET_SEASON);

  // Check if the season document exists, if not, create it.
  const seasonSnap = await seasonRef.get();
  if (!seasonSnap.exists) {
    console.log(`Season document '${TARGET_SEASON}' does not exist. Creating it.`);
    await seasonRef.set({
      year: parseInt(TARGET_SEASON),
      status: 'active'
    });
  }

  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    const sourceColRef = db.collection(collectionName);
    const destinationColRef = seasonRef.collection(collectionName);
    
    console.log(`\nMigrating collection: '${collectionName}'...`);

    const snapshot = await sourceColRef.get();
    if (snapshot.empty) {
      console.log(` -> Source collection '${collectionName}' is empty. Skipping.`);
      continue;
    }

    let count = 0;
    const batchSize = 100;
    let batch = db.batch();

    for (const doc of snapshot.docs) {
      const docData = doc.data();
      const newDocRef = destinationColRef.doc(doc.id); 
      batch.set(newDocRef, docData);
      count++;

      if (count % batchSize === 0) {
        await batch.commit();
        batch = db.batch();
        console.log(` -> Committed ${count} documents...`);
      }
    }

    if (count % batchSize !== 0) {
      await batch.commit();
    }

    console.log(` -> Successfully migrated ${count} documents from '${collectionName}' to 'seasons/${TARGET_SEASON}/${collectionName}'.`);
  }

  console.log('\n---------------------------------');
  console.log('✅ Data migration complete! ✅');
  console.log('Your data has been copied to the new subcollection structure.');
  console.log('The original collections are still intact.');
  console.log('---------------------------------');
}

migrateData().catch(error => {
  console.error('❌ An error occurred during migration:', error);
  process.exit(1);
});
