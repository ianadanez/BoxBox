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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRaceResults = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const engine_1 = require("./engine");
admin.initializeApp();
// NOTE: This is a simplified version for demonstration. For a real app, you would want to add more robust error handling.
exports.processRaceResults = functions.https.onCall(async (data, context) => {
    const gpId = data.gpId;
    const db = admin.firestore();
    // 1. Fetch all necessary data
    const gpDoc = await db.collection("gps").doc(String(gpId)).get();
    const officialResultDoc = await db.collection("officialResults").doc(String(gpId)).get();
    const predictionsSnapshot = await db.collectionGroup("predictions").where("gpId", "==", gpId).get();
    if (!gpDoc.exists || !officialResultDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Grand Prix or official result not found.");
    }
    const grandPrix = gpDoc.data();
    const officialResult = officialResultDoc.data();
    // 2. Process each prediction and calculate score
    const batch = db.batch();
    predictionsSnapshot.forEach(predDoc => {
        const prediction = predDoc.data();
        const gpScore = engine_1.engine.calculateGpScore(grandPrix, prediction, officialResult);
        // Path: users/{userId}/gpScores/{gpId}
        const userGpScoreRef = db.collection("users").doc(prediction.userId).collection("gpScores").doc(String(gpId));
        batch.set(userGpScoreRef, gpScore);
    });
    // 3. Commit all writes to the database at once
    await batch.commit();
    return { success: true, message: `Successfully processed ${predictionsSnapshot.size} predictions for ${grandPrix.name}.` };
});
//# sourceMappingURL=index.js.map