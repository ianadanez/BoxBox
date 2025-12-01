import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { engine } from "./engine";
import { GrandPrix, Prediction, OfficialResult, GpScore } from "../../types";

admin.initializeApp();

// NOTE: This is a simplified version for demonstration. For a real app, you would want to add more robust error handling.
export const processRaceResults = functions.https.onCall(async (request) => {
  const gpId = request.data.gpId as number;
  const db = admin.firestore();

  // 1. Fetch all necessary data
  const gpDoc = await db.collection("gps").doc(String(gpId)).get();
  const officialResultDoc = await db.collection("officialResults").doc(String(gpId)).get();
  const predictionsSnapshot = await db.collectionGroup("predictions").where("gpId", "==", gpId).get();

  if (!gpDoc.exists || !officialResultDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Grand Prix or official result not found.");
  }

  const grandPrix = gpDoc.data() as GrandPrix;
  const officialResult = officialResultDoc.data() as OfficialResult;

  // 2. Process each prediction and calculate score
  const batch = db.batch();
  predictionsSnapshot.forEach(predDoc => {
    const prediction = predDoc.data() as Prediction;
    const gpScore: GpScore = engine.calculateGpScore(grandPrix, prediction, officialResult);

    // Path: users/{userId}/gpScores/{gpId}
    const userGpScoreRef = db.collection("users").doc(prediction.userId).collection("gpScores").doc(String(gpId));
    batch.set(userGpScoreRef, gpScore);
  });

  // 3. Commit all writes to the database at once
  await batch.commit();

  return { success: true, message: `Successfully processed ${predictionsSnapshot.size} predictions for ${grandPrix.name}.` };
});
