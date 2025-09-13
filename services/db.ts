

import { User, Team, Driver, GrandPrix, Prediction, OfficialResult, Result, Tournament, Score, SeasonTotal, PointAdjustment, Notification, PokeNotification, TournamentInviteNotification, ResultsNotification, PointsAdjustmentNotification, TournamentInviteAcceptedNotification, TournamentInviteDeclinedNotification, GpScore } from '../types';
import { TEAMS, DRIVERS, GP_SCHEDULE, SCORING_RULES } from '../constants';
// FIX: Added firebase compat import for FieldValue operations.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
// FIX: Updated firebase config now provides compat instances.
import { firestoreDb as firestore } from '../firebaseConfig';


// --- Collection References ---
// FIX: Use compat API for collection references.
const usersCol = firestore.collection('users');
const teamsCol = firestore.collection('teams');
const driversCol = firestore.collection('drivers');
const scheduleCol = firestore.collection('schedule');
const predictionsCol = firestore.collection('predictions');
const resultsCol = firestore.collection('results');
const draftResultsCol = firestore.collection('draft_results');
const tournamentsCol = firestore.collection('tournaments');
const pointAdjustmentsCol = firestore.collection('pointAdjustments');
const notificationsCol = firestore.collection('notifications');


// --- Firestore DB Service Implementation ---
export const db = {
  // Users
  getUsers: async (): Promise<User[]> => {
      // FIX: Use compat API `get()` method.
      const snapshot = await usersCol.get();
      return snapshot.docs.map(doc => doc.data() as User);
  },
  getUsersByIds: async (ids: string[]): Promise<User[]> => {
      if (ids.length === 0) {
          return [];
      }
      // Firestore 'in' query can take up to 30 elements.
      // For notifications, this is a safe assumption. For larger queries, chunking would be needed.
      const q = usersCol.where(firebase.firestore.FieldPath.documentId(), 'in', ids);
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as User);
  },
  getUserByEmail: async (email: string): Promise<User | undefined> => {
      // FIX: Use compat API `where()` and `get()` methods.
      const q = usersCol.where("email", "==", email);
      const snapshot = await q.get();
      if (snapshot.empty) return undefined;
      return snapshot.docs[0].data() as User;
  },
  getUserByUsername: async (username: string): Promise<User | undefined> => {
      const q = usersCol.where("username", "==", username);
      const snapshot = await q.get();
      if (snapshot.empty) return undefined;
      return snapshot.docs[0].data() as User;
  },
  getUserById: async (id: string): Promise<User | undefined> => {
      // FIX: Use compat API `doc()` and `get()` methods.
      const docRef = usersCol.doc(id);
      const docSnap = await docRef.get();
      return docSnap.exists ? docSnap.data() as User : undefined;
  },
  saveUser: async (user: User): Promise<void> => {
      const { password, ...userData } = user; // Never store password in Firestore
      // FIX: Use compat API `doc()` and `set()` methods.
      const docRef = usersCol.doc(user.id);
      await docRef.set(userData, { merge: true });
  },

  // Catalogue
  getTeams: async (): Promise<Team[]> => {
      // FIX: Use compat API `get()` method.
      const snapshot = await teamsCol.get();
      return snapshot.docs.map(doc => doc.data() as Team);
  },
  getDrivers: async (activeOnly = false): Promise<Driver[]> => {
      // FIX: Use compat API `where()` and `get()` methods.
      const q = activeOnly ? driversCol.where("isActive", "==", true) : driversCol;
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as Driver);
  },
  saveDriver: async (driver: Driver): Promise<void> => {
      // FIX: Use compat API `doc()` and `set()` methods.
      const docRef = driversCol.doc(driver.id);
      await docRef.set(driver, { merge: true });
  },
  getSchedule: async (): Promise<GrandPrix[]> => {
      // FIX: Use compat API `orderBy()` and `get()` methods.
      const q = scheduleCol.orderBy("id");
      // FIX: Complete function by awaiting snapshot and returning data.
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as GrandPrix);
  },
  saveGp: async (gp: GrandPrix): Promise<void> => {
      const docRef = scheduleCol.doc(String(gp.id));
      await docRef.set(gp, { merge: true });
  },
  deleteGp: async (gpId: number): Promise<void> => {
      const docRef = scheduleCol.doc(String(gpId));
      await docRef.delete();
  },
  replaceSchedule: async (newSchedule: GrandPrix[]): Promise<void> => {
      const batch = firestore.batch();
      const existingDocs = await scheduleCol.get();
      existingDocs.forEach(doc => batch.delete(doc.ref));
      newSchedule.forEach(gp => {
          const docRef = scheduleCol.doc(String(gp.id));
          batch.set(docRef, gp);
      });
      await batch.commit();
  },

  // Predictions
  getPrediction: async (userId: string, gpId: number): Promise<Prediction | undefined> => {
      const docId = `${userId}_${gpId}`;
      const docRef = predictionsCol.doc(docId);
      const docSnap = await docRef.get();
      return docSnap.exists ? docSnap.data() as Prediction : undefined;
  },
   getPredictionsForUser: async (userId: string): Promise<Prediction[]> => {
    const q = predictionsCol.where("userId", "==", userId);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => doc.data() as Prediction);
  },
  getPredictionsForGp: async (gpId: number): Promise<Prediction[]> => {
      const q = predictionsCol.where("gpId", "==", gpId);
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as Prediction);
  },
  savePrediction: async (prediction: Prediction): Promise<void> => {
      const docId = `${prediction.userId}_${prediction.gpId}`;
      const docRef = predictionsCol.doc(docId);
      await docRef.set(prediction, { merge: true });
  },

  // Results
  getDraftResult: async (gpId: number): Promise<Result | undefined> => {
      const docRef = draftResultsCol.doc(String(gpId));
      const docSnap = await docRef.get();
      return docSnap.exists ? docSnap.data() as Result : undefined;
  },
  saveDraftResult: async (result: Result): Promise<void> => {
      const docRef = draftResultsCol.doc(String(result.gpId));
      await docRef.set(result, { merge: true });
  },
  getOfficialResults: async (): Promise<OfficialResult[]> => {
      const snapshot = await resultsCol.orderBy("gpId").get();
      return snapshot.docs.map(doc => doc.data() as OfficialResult);
  },
  getOfficialResult: async (gpId: number): Promise<OfficialResult | undefined> => {
      const docRef = resultsCol.doc(String(gpId));
      const docSnap = await docRef.get();
      return docSnap.exists ? docSnap.data() as OfficialResult : undefined;
  },
  publishSessionResults: async (gpId: number, session: 'quali' | 'sprint' | 'race', sessionResults: Partial<Result>, manualOverrides: Partial<OfficialResult['manualOverrides']>): Promise<void> => {
      const batch = firestore.batch();
      const resultRef = resultsCol.doc(String(gpId));
      
      const resultDataToSave = {
          ...sessionResults,
          gpId,
          publishedAt: new Date().toISOString(),
          publishedSessions: firebase.firestore.FieldValue.arrayUnion(session),
          manualOverrides
      };
      
      batch.set(resultRef, resultDataToSave, { merge: true });
      
      const gpSnap = await scheduleCol.doc(String(gpId)).get();
      const gp = gpSnap.exists ? gpSnap.data() as GrandPrix : undefined;
      const gpName = gp ? gp.name : `GP ${gpId}`;

      const predictionsSnap = await predictionsCol.where("gpId", "==", gpId).get();
      const userIds = [...new Set(predictionsSnap.docs.map(p => (p.data() as Prediction).userId))];

      for (const userId of userIds) {
          const notifRef = notificationsCol.doc();
          const notification: ResultsNotification = {
              id: notifRef.id,
              toUserId: userId,
              type: 'results',
              gpId,
              gpName,
              session,
              timestamp: new Date().toISOString(),
              seen: false,
          };
          batch.set(notifRef, notification);
      }
      
      await batch.commit();
  },
  // FIX: Added missing `publishResult` function that was called from the Admin page.
  // This function saves a full result set and sends notifications for any newly published sessions.
  publishResult: async (result: OfficialResult): Promise<void> => {
    const batch = firestore.batch();
    const resultRef = resultsCol.doc(String(result.gpId));

    const existingResultSnap = await resultRef.get();
    const existingResult = existingResultSnap.exists ? existingResultSnap.data() as OfficialResult : null;
    const existingSessions = existingResult?.publishedSessions || [];
    
    const newSessions = result.publishedSessions.filter(s => !existingSessions.includes(s));

    batch.set(resultRef, result, { merge: true });

    if (newSessions.length > 0) {
        const gpSnap = await scheduleCol.doc(String(result.gpId)).get();
        const gp = gpSnap.exists ? gpSnap.data() as GrandPrix : undefined;
        const gpName = gp ? gp.name : `GP ${result.gpId}`;

        const predictionsSnap = await predictionsCol.where("gpId", "==", result.gpId).get();
        const userIds = [...new Set(predictionsSnap.docs.map(p => (p.data() as Prediction).userId))];

        for (const session of newSessions) {
            for (const userId of userIds) {
                const notifRef = notificationsCol.doc();
                const notification: ResultsNotification = {
                    id: notifRef.id,
                    toUserId: userId,
                    type: 'results',
                    gpId: result.gpId,
                    gpName,
                    session,
                    timestamp: new Date().toISOString(),
                    seen: false,
                };
                batch.set(notifRef, notification);
            }
        }
    }
    await batch.commit();
  },


  // Scoring
  calculateGpScore: async (prediction: Prediction, result: OfficialResult): Promise<GpScore> => {
    const gp = (await scheduleCol.doc(String(result.gpId)).get()).data() as GrandPrix;
    
    const score: GpScore = {
        gpId: result.gpId,
        gpName: gp?.name || `GP ${result.gpId}`,
        totalPoints: 0,
        breakdown: {
            pole: 0, sprintPole: 0, sprintPodium: 0,
            racePodium: 0, fastestLap: 0, driverOfTheDay: 0
        }
    };

    if (result.pole && result.pole === prediction.pole) {
        score.breakdown.pole += SCORING_RULES.pole;
    }
    if (result.fastestLap && result.fastestLap === prediction.fastestLap) {
        score.breakdown.fastestLap += SCORING_RULES.fastestLap;
    }
    if (result.driverOfTheDay && result.driverOfTheDay === prediction.driverOfTheDay) {
        score.breakdown.driverOfTheDay += SCORING_RULES.driverOfTheDay;
    }
    if (result.racePodium && prediction.racePodium) {
        if (result.racePodium[0] === prediction.racePodium[0]) score.breakdown.racePodium += SCORING_RULES.racePodium.p1;
        if (result.racePodium[1] === prediction.racePodium[1]) score.breakdown.racePodium += SCORING_RULES.racePodium.p2;
        if (result.racePodium[2] === prediction.racePodium[2]) score.breakdown.racePodium += SCORING_RULES.racePodium.p3;
        
        const correctPositions = [prediction.racePodium[0] === result.racePodium[0], prediction.racePodium[1] === result.racePodium[1], prediction.racePodium[2] === result.racePodium[2]];
        prediction.racePodium.forEach((driverId, index) => {
            // FIX: Cast tuple to `readonly string[]` to help TypeScript resolve the correct overload for the `includes` method.
            if (driverId && (result.racePodium as readonly string[]).includes(driverId) && !correctPositions[index]) {
                score.breakdown.racePodium += SCORING_RULES.racePodium.inPodium;
            }
        });
    }
    if (result.sprintPole && result.sprintPole === prediction.sprintPole) {
        score.breakdown.sprintPole += SCORING_RULES.sprintPole;
    }
    if (result.sprintPodium && prediction.sprintPodium) {
        if (result.sprintPodium[0] === prediction.sprintPodium[0]) score.breakdown.sprintPodium += SCORING_RULES.sprintPodium.p1;
        if (result.sprintPodium[1] === prediction.sprintPodium[1]) score.breakdown.sprintPodium += SCORING_RULES.sprintPodium.p2;
        if (result.sprintPodium[2] === prediction.sprintPodium[2]) score.breakdown.sprintPodium += SCORING_RULES.sprintPodium.p3;

        const correctSprintPositions = [prediction.sprintPodium[0] === result.sprintPodium[0], prediction.sprintPodium[1] === result.sprintPodium[1], prediction.sprintPodium[2] === result.sprintPodium[2]];
        prediction.sprintPodium.forEach((driverId, index) => {
            // FIX: Cast tuple to `readonly string[]` to help TypeScript resolve the correct overload for the `includes` method.
            if (driverId && (result.sprintPodium as readonly string[]).includes(driverId) && !correctSprintPositions[index]) {
                score.breakdown.sprintPodium += SCORING_RULES.sprintPodium.inPodium;
            }
        });
    }

    score.totalPoints = Object.values(score.breakdown).reduce((a, b) => a + b, 0);
    
    return score;
  },
  calculateSeasonTotals: async (): Promise<SeasonTotal[]> => {
    const [usersSnap, predictionsSnap, resultsSnap, adjustmentsSnap] = await Promise.all([
        usersCol.get(),
        predictionsCol.get(),
        resultsCol.get(),
        pointAdjustmentsCol.orderBy("timestamp", "desc").get(),
    ]);

    const users = usersSnap.docs.map(d => d.data() as User);
    const allPredictions = predictionsSnap.docs.map(d => d.data() as Prediction);
    const officialResults = resultsSnap.docs.map(d => d.data() as OfficialResult);
    const pointAdjustments = adjustmentsSnap.docs.map(d => d.data() as PointAdjustment);

    const scores: { [userId: string]: SeasonTotal } = {};

    users.forEach(user => {
        scores[user.id] = {
            userId: user.id,
            userUsername: user.username || user.email.split('@')[0],
            userAvatar: user.avatar,
            totalPoints: 0,
            details: { exactPole: 0, exactP1: 0, exactFastestLap: 0 },
            pointAdjustments: [],
        };
    });

    officialResults.forEach(result => {
        const gpPredictions = allPredictions.filter(p => p.gpId === result.gpId);
        gpPredictions.forEach(pred => {
            if (!scores[pred.userId]) return;

            let gpPoints = 0;

            if (result.pole && result.pole === pred.pole) {
                gpPoints += SCORING_RULES.pole;
                scores[pred.userId].details.exactPole++;
            }
            if (result.fastestLap && result.fastestLap === pred.fastestLap) {
                gpPoints += SCORING_RULES.fastestLap;
                scores[pred.userId].details.exactFastestLap++;
            }
            if (result.driverOfTheDay && result.driverOfTheDay === pred.driverOfTheDay) {
                gpPoints += SCORING_RULES.driverOfTheDay;
            }
            if (result.racePodium && pred.racePodium) {
                if (result.racePodium[0] === pred.racePodium[0]) {
                    gpPoints += SCORING_RULES.racePodium.p1;
                    scores[pred.userId].details.exactP1++;
                }
                if (result.racePodium[1] === pred.racePodium[1]) gpPoints += SCORING_RULES.racePodium.p2;
                if (result.racePodium[2] === pred.racePodium[2]) gpPoints += SCORING_RULES.racePodium.p3;
                
                const correctPositions = [pred.racePodium[0] === result.racePodium[0], pred.racePodium[1] === result.racePodium[1], pred.racePodium[2] === result.racePodium[2]];
                pred.racePodium.forEach((driverId, index) => {
                    // FIX: Cast to a string array to ensure `includes` method is correctly resolved for the tuple type.
                    if (driverId && (result.racePodium as readonly string[]).includes(driverId) && !correctPositions[index]) {
                        gpPoints += SCORING_RULES.racePodium.inPodium;
                    }
                });
            }
            if (result.sprintPole && result.sprintPole === pred.sprintPole) {
                gpPoints += SCORING_RULES.sprintPole;
            }
            if (result.sprintPodium && pred.sprintPodium) {
                if (result.sprintPodium[0] === pred.sprintPodium[0]) gpPoints += SCORING_RULES.sprintPodium.p1;
                if (result.sprintPodium[1] === pred.sprintPodium[1]) gpPoints += SCORING_RULES.sprintPodium.p2;
                if (result.sprintPodium[2] === pred.sprintPodium[2]) gpPoints += SCORING_RULES.sprintPodium.p3;

                const correctSprintPositions = [pred.sprintPodium[0] === result.sprintPodium[0], pred.sprintPodium[1] === result.sprintPodium[1], pred.sprintPodium[2] === result.sprintPodium[2]];
                pred.sprintPodium.forEach((driverId, index) => {
                    // FIX: Cast to a string array to ensure `includes` method is correctly resolved for the tuple type.
                    if (driverId && (result.sprintPodium as readonly string[]).includes(driverId) && !correctSprintPositions[index]) {
                        gpPoints += SCORING_RULES.sprintPodium.inPodium;
                    }
                });
            }
            scores[pred.userId].totalPoints += gpPoints;
        });
    });
    
    pointAdjustments.forEach(adj => {
        if (scores[adj.userId]) {
            scores[adj.userId].totalPoints += adj.points;
            scores[adj.userId].pointAdjustments?.push(adj);
        }
    });

    return Object.values(scores).sort((a, b) => b.totalPoints - a.totalPoints);
  },

  // Tournaments
  getTournaments: async (): Promise<Tournament[]> => {
      const snapshot = await tournamentsCol.get();
      return snapshot.docs.map(doc => doc.data() as Tournament);
  },
  saveTournament: async (tournament: Tournament): Promise<void> => {
      const docRef = tournamentsCol.doc(tournament.id);
      await docRef.set(tournament, { merge: true });
  },
  addTournament: async (tournamentData: Omit<Tournament, 'id' | 'pendingMemberIds'>): Promise<Tournament> => {
      const docRef = tournamentsCol.doc();
      const newTournament: Tournament = {
          ...tournamentData,
          id: docRef.id,
          pendingMemberIds: [],
      };
      await docRef.set(newTournament);
      return newTournament;
  },
  findTournamentByCode: async (code: string): Promise<Tournament | undefined> => {
      const q = tournamentsCol.where("inviteCode", "==", code).limit(1);
      const snapshot = await q.get();
      if (snapshot.empty) return undefined;
      return snapshot.docs[0].data() as Tournament;
  },
  leaveTournament: async (userId: string, tournamentId: string): Promise<void> => {
    const tournamentRef = tournamentsCol.doc(tournamentId);
    await tournamentRef.update({
        memberIds: firebase.firestore.FieldValue.arrayRemove(userId)
    });
  },
  deleteTournament: async (tournamentId: string): Promise<void> => {
      const tournamentRef = tournamentsCol.doc(tournamentId);
      await tournamentRef.delete();
  },

  // Notifications & Invites
  listenForNotificationsForUser: (userId: string, onUpdate: (notifications: Notification[]) => void): () => void => {
      // FIX: Removed orderBy to prevent query from requiring a composite index.
      // The listener was likely failing silently because the index was not configured.
      // Sorting is now handled on the client-side.
      const q = notificationsCol.where("toUserId", "==", userId).limit(30);
      const unsubscribe = q.onSnapshot(snapshot => {
          const notifications = snapshot.docs.map(doc => doc.data() as Notification);
          // Sort client-side to ensure newest are first, then take the top 20 for display
          notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          onUpdate(notifications.slice(0, 20));
      }, err => {
          console.error("Error listening for notifications:", err);
      });
      return unsubscribe;
  },
  markNotificationsAsSeen: async (notificationIds: string[]): Promise<void> => {
      if(notificationIds.length === 0) return;
      const batch = firestore.batch();
      notificationIds.forEach(id => {
          const docRef = notificationsCol.doc(id);
          batch.update(docRef, { seen: true });
      });
      await batch.commit();
  },
  sendTournamentInvite: async (fromUserId: string, toUserId: string, tournamentId: string, tournamentName: string): Promise<boolean> => {
      const tournamentRef = tournamentsCol.doc(tournamentId);
      const tournamentSnap = await tournamentRef.get();
      if (!tournamentSnap.exists) return false;

      const tournament = tournamentSnap.data() as Tournament;
      // FIX: Add explicit check for tournament.pendingMemberIds to avoid runtime error.
      if (tournament.memberIds.includes(toUserId) || (tournament.pendingMemberIds && tournament.pendingMemberIds.includes(toUserId))) {
          return false;
      }

      const batch = firestore.batch();
      
      batch.update(tournamentRef, {
          pendingMemberIds: firebase.firestore.FieldValue.arrayUnion(toUserId)
      });
      
      const notifRef = notificationsCol.doc();
      const invite: TournamentInviteNotification = {
          id: notifRef.id, toUserId, fromUserId, tournamentId, tournamentName,
          type: 'tournament_invite', timestamp: new Date().toISOString(), seen: false,
      };
      batch.set(notifRef, invite);

      await batch.commit();
      return true;
  },
  acceptTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<Tournament | null> => {
      const tournamentRef = tournamentsCol.doc(tournamentId);
      const tournamentSnap = await tournamentRef.get();
      if (!tournamentSnap.exists) {
          await notificationsCol.doc(notificationId).delete();
          return null;
      }
      const tournament = tournamentSnap.data() as Tournament;

      const batch = firestore.batch();
      batch.update(tournamentRef, {
          memberIds: firebase.firestore.FieldValue.arrayUnion(userId),
          pendingMemberIds: firebase.firestore.FieldValue.arrayRemove(userId),
      });
      batch.delete(notificationsCol.doc(notificationId));

      const creatorNotifRef = notificationsCol.doc();
      const acceptedNotification: TournamentInviteAcceptedNotification = {
          id: creatorNotifRef.id, toUserId: tournament.creatorId, fromUserId: userId,
          tournamentId: tournament.id, tournamentName: tournament.name,
          type: 'tournament_invite_accepted', timestamp: new Date().toISOString(), seen: false,
      };
      batch.set(creatorNotifRef, acceptedNotification);
      
      await batch.commit();
      
      return { ...tournament, memberIds: [...tournament.memberIds, userId] };
  },
  declineTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<void> => {
      const tournamentRef = tournamentsCol.doc(tournamentId);
      const tournamentSnap = await tournamentRef.get();
      if (!tournamentSnap.exists) {
          await notificationsCol.doc(notificationId).delete();
          return;
      }
      const tournament = tournamentSnap.data() as Tournament;
      
      const batch = firestore.batch();
      batch.update(tournamentRef, {
          pendingMemberIds: firebase.firestore.FieldValue.arrayRemove(userId),
      });
      batch.delete(notificationsCol.doc(notificationId));

      const creatorNotifRef = notificationsCol.doc();
      const declinedNotification: TournamentInviteDeclinedNotification = {
          id: creatorNotifRef.id, toUserId: tournament.creatorId, fromUserId: userId,
          tournamentId: tournament.id, tournamentName: tournament.name,
          type: 'tournament_invite_declined', timestamp: new Date().toISOString(), seen: false,
      };
      batch.set(creatorNotifRef, declinedNotification);
      
      await batch.commit();
  },

  // Pokes
  addPoke: async (fromUserId: string, toUserId: string): Promise<void> => {
      const docRef = notificationsCol.doc();
      const poke: PokeNotification = {
          id: docRef.id, fromUserId, toUserId, type: 'poke',
          timestamp: new Date().toISOString(), seen: false,
      };
      await docRef.set(poke);
  },
  getExistingUnseenPoke: async (fromUserId: string, toUserId: string): Promise<PokeNotification | undefined> => {
      const q = notificationsCol
          .where("fromUserId", "==", fromUserId)
          .where("toUserId", "==", toUserId)
          .where("type", "==", "poke")
          .where("seen", "==", false)
          .limit(1);
      const snapshot = await q.get();
      if (snapshot.empty) return undefined;
      return snapshot.docs[0].data() as PokeNotification;
  },
  
  // Admin
  getPointAdjustments: async (): Promise<PointAdjustment[]> => {
      const q = pointAdjustmentsCol.orderBy("timestamp", "desc");
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as PointAdjustment);
  },
  addPointAdjustment: async (adjustment: Omit<PointAdjustment, 'id' | 'timestamp'>): Promise<void> => {
      const batch = firestore.batch();
      
      const adjRef = pointAdjustmentsCol.doc();
      const newAdjustment: PointAdjustment = {
          ...adjustment,
          id: adjRef.id,
          timestamp: new Date().toISOString(),
      };
      batch.set(adjRef, newAdjustment);

      const notifRef = notificationsCol.doc();
      const notification: PointsAdjustmentNotification = {
          id: notifRef.id, toUserId: adjustment.userId, type: 'points_adjustment',
          points: adjustment.points, reason: adjustment.reason, adminId: adjustment.adminId,
          timestamp: new Date().toISOString(), seen: false,
      };
      batch.set(notifRef, notification);
      
      await batch.commit();
  },
  seedFirebase: async (): Promise<void> => {
      console.log("Starting Firebase seed...");
      
      const collectionsToClear = [teamsCol, driversCol, scheduleCol, predictionsCol, resultsCol, draftResultsCol, tournamentsCol, pointAdjustmentsCol, notificationsCol];
      
      for (const col of collectionsToClear) {
          const snapshot = await col.get();
          if (snapshot.empty) continue;
          const batch = firestore.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`Cleared collection: ${col.id}`);
      }
      
      const seedBatch = firestore.batch();
      TEAMS.forEach(team => seedBatch.set(teamsCol.doc(team.id), team));
      DRIVERS.forEach(driver => seedBatch.set(driversCol.doc(driver.id), driver));
      GP_SCHEDULE.forEach(gp => seedBatch.set(scheduleCol.doc(String(gp.id)), gp));
      
      await seedBatch.commit();
      console.log("Seeded Teams, Drivers, and Schedule.");
      console.log("NOTE: Test users (e.g., admin@boxbox.com) must be created manually in the Firebase Authentication console.");
      console.log("Firebase seed complete.");
  },
};