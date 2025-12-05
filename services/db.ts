
import { User, Team, Driver, GrandPrix, Prediction, OfficialResult, Result, Tournament, GpScore, SeasonTotal, PointAdjustment, Notification, ResultsNotification, TournamentInviteNotification, TournamentInviteAcceptedNotification, TournamentInviteDeclinedNotification, PokeNotification, PointsAdjustmentNotification, Season } from '../types';
import { TEAMS, DRIVERS, GP_SCHEDULE } from '../constants';
import { engine } from './engine';
// Import the season service functions
import { getActiveSeason, clearActiveSeasonCache } from './seasonService';

// FIX: Added firebase compat import for FieldValue operations.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
// FIX: Corrected the import to match the export from firebaseConfig.ts
import { firestore } from '../firebaseConfig';


// --- Top-Level Collection References ---
const usersCol = firestore.collection('users');
const notificationsCol = firestore.collection('notifications');
const seasonsCol = firestore.collection('seasons'); // New collection ref


// --- SEASON-AWARE HELPER ---
/**
 * A helper function to get a reference to a collection within the active season.
 * This is the core of our multi-season architecture.
 * @param collectionName The name of the subcollection (e.g., 'schedule', 'teams').
 * @returns A CollectionReference or null if no season is active.
 */
const getSeasonCollection = async (collectionName: 'schedule' | 'predictions' | 'results' | 'tournaments' | 'pointAdjustments' | 'draft_results' | 'teams' | 'drivers') => {
    const seasonId = await getActiveSeason();
    if (!seasonId) {
        console.warn(`No active season found. Cannot access collection '${collectionName}'.`);
        return null;
    }
    return firestore.collection(`seasons/${seasonId}/${collectionName}`);
};


// Helper function to provide a fallback for the username property.
const applyUsernameFallback = (user: User): User => {
    const userWithPotentialName = user as any;
    if (!user.username && userWithPotentialName.name) {
        return { ...user, username: userWithPotentialName.name };
    }
    if (!user.username && !userWithPotentialName.name) {
        return { ...user, username: user.email.split('@')[0] };
    }
    return user;
};


// --- Firestore DB Service Implementation ---
export const db = {
  // Users (Unaffected by seasons)
  getUsers: async (): Promise<User[]> => {
      const snapshot = await usersCol.get();
      return snapshot.docs.map(doc => applyUsernameFallback(doc.data() as User));
  },
  getUsersByIds: async (ids: string[]): Promise<User[]> => {
      if (ids.length === 0) return [];
      const q = usersCol.where(firebase.firestore.FieldPath.documentId(), 'in', ids);
      const snapshot = await q.get();
      return snapshot.docs.map(doc => applyUsernameFallback(doc.data() as User));
  },
  getUserByEmail: async (email: string): Promise<User | undefined> => {
      const q = usersCol.where("email", "==", email);
      const snapshot = await q.get();
      if (snapshot.empty) return undefined;
      return applyUsernameFallback(snapshot.docs[0].data() as User);
  },
  getUserByUsername: async (username: string): Promise<User | undefined> => {
      const q = usersCol.where("username", "==", username);
      const snapshot = await q.get();
      if (snapshot.empty) return undefined;
      return snapshot.docs[0].data() as User;
  },
  getUserById: async (id: string): Promise<User | undefined> => {
      const docRef = usersCol.doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return undefined;
      return applyUsernameFallback(docSnap.data() as User);
  },
  saveUser: async (user: User): Promise<void> => {
      const docRef = usersCol.doc(user.id);
      await docRef.set(user, { merge: true });
  },

  // --- SEASON MANAGEMENT ---
  listSeasons: async (): Promise<Season[]> => {
      const snapshot = await seasonsCol.get();
      return snapshot.docs.map(doc => doc.data() as Season);
  },

  switchActiveSeason: async (seasonId: string): Promise<void> => {
    const batch = firestore.batch();
    
    const allSeasonsSnap = await seasonsCol.get();
    allSeasonsSnap.forEach(doc => {
        batch.update(doc.ref, { status: 'inactive' });
    });

    const newActiveSeasonRef = seasonsCol.doc(seasonId);
    batch.set(newActiveSeasonRef, { id: seasonId, status: 'active' }, { merge: true });

    await batch.commit();
    clearActiveSeasonCache();
    console.log(`Switched active season to ${seasonId}`);
  },

  createNewSeason: async (seasonId: string): Promise<void> => {
      const newSeasonRef = seasonsCol.doc(seasonId);
      const doc = await newSeasonRef.get();

      if (doc.exists) {
          throw new Error(`Season ${seasonId} already exists!`);
      }

      console.log(`Creating new season ${seasonId}...`);
      const batch = firestore.batch();

      // 1. Create the season document
      const newSeasonData: Season = {
          id: seasonId,
          name: `Formula 1 Season ${seasonId}`,
          status: 'inactive', // It's not active by default
      };
      batch.set(newSeasonRef, newSeasonData);

      // 2. Seed the new season with default data
      const scheduleCol = firestore.collection(`seasons/${seasonId}/schedule`);
      const teamsCol = firestore.collection(`seasons/${seasonId}/teams`);
      const driversCol = firestore.collection(`seasons/${seasonId}/drivers`);

      GP_SCHEDULE.forEach(gp => batch.set(scheduleCol.doc(String(gp.id)), gp));
      TEAMS.forEach(team => batch.set(teamsCol.doc(team.id), team));
      DRIVERS.forEach(driver => batch.set(driversCol.doc(driver.id), driver));

      await batch.commit();
      console.log(`Successfully created and seeded season ${seasonId}.`);
  },

  // --- SEASONAL DATA ---

  // Catalogue (Now Season-Aware)
  getTeams: async (): Promise<Team[]> => {
      const teamsCol = await getSeasonCollection('teams');
      if (!teamsCol) return [];
      const snapshot = await teamsCol.get();
      return snapshot.docs.map(doc => doc.data() as Team);
  },
  getDrivers: async (activeOnly = false): Promise<Driver[]> => {
      const driversCol = await getSeasonCollection('drivers');
      if (!driversCol) return [];
      const q = activeOnly ? driversCol.where("isActive", "==", true) : driversCol;
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as Driver);
  },
  saveDriver: async (driver: Driver): Promise<void> => {
      const driversCol = await getSeasonCollection('drivers');
      if (!driversCol) return;
      const docRef = driversCol.doc(driver.id);
      await docRef.set(driver, { merge: true });
  },

  // Schedule
  getSchedule: async (): Promise<GrandPrix[]> => {
      const scheduleCol = await getSeasonCollection('schedule');
      if (!scheduleCol) return [];
      const q = scheduleCol.orderBy("id");
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as GrandPrix);
  },
  saveGp: async (gp: GrandPrix): Promise<void> => {
      const scheduleCol = await getSeasonCollection('schedule');
      if (!scheduleCol) return;
      const docRef = scheduleCol.doc(String(gp.id));
      await docRef.set(gp, { merge: true });
  },
  deleteGp: async (gpId: number): Promise<void> => {
      const scheduleCol = await getSeasonCollection('schedule');
      if (!scheduleCol) return;
      const docRef = scheduleCol.doc(String(gpId));
      await docRef.delete();
  },
  replaceSchedule: async (newSchedule: GrandPrix[]): Promise<void> => {
      const scheduleCol = await getSeasonCollection('schedule');
      if (!scheduleCol) return;
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
      const predictionsCol = await getSeasonCollection('predictions');
      if (!predictionsCol) return undefined;
      const docId = `${userId}_${gpId}`;
      const docRef = predictionsCol.doc(docId);
      const docSnap = await docRef.get();
      return docSnap.exists ? docSnap.data() as Prediction : undefined;
  },
   getPredictionsForUser: async (userId: string): Promise<Prediction[]> => {
    const predictionsCol = await getSeasonCollection('predictions');
    if (!predictionsCol) return [];
    const q = predictionsCol.where("userId", "==", userId);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => doc.data() as Prediction);
  },
  getPredictionsForGp: async (gpId: number): Promise<Prediction[]> => {
      const predictionsCol = await getSeasonCollection('predictions');
      if (!predictionsCol) return [];
      const q = predictionsCol.where("gpId", "==", gpId);
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as Prediction);
  },
  savePrediction: async (prediction: Prediction): Promise<void> => {
      const predictionsCol = await getSeasonCollection('predictions');
      if (!predictionsCol) return;
      const docId = `${prediction.userId}_${prediction.gpId}`;
      const docRef = predictionsCol.doc(docId);
      await docRef.set(prediction, { merge: true });
  },

  // Results
  getDraftResult: async (gpId: number): Promise<Result | undefined> => {
      const draftResultsCol = await getSeasonCollection('draft_results');
      if (!draftResultsCol) return undefined;
      const docRef = draftResultsCol.doc(String(gpId));
      const docSnap = await docRef.get();
      return docSnap.exists ? docSnap.data() as Result : undefined;
  },
  saveDraftResult: async (result: Result): Promise<void> => {
      const draftResultsCol = await getSeasonCollection('draft_results');
      if (!draftResultsCol) return;
      const docRef = draftResultsCol.doc(String(result.gpId));
      await docRef.set(result, { merge: true });
  },
  getOfficialResults: async (): Promise<OfficialResult[]> => {
      const resultsCol = await getSeasonCollection('results');
      if (!resultsCol) return [];
      const snapshot = await resultsCol.orderBy("gpId").get();
      return snapshot.docs.map(doc => doc.data() as OfficialResult);
  },
  getOfficialResult: async (gpId: number): Promise<OfficialResult | undefined> => {
      const resultsCol = await getSeasonCollection('results');
      if (!resultsCol) return undefined;
      const docRef = resultsCol.doc(String(gpId));
      const docSnap = await docRef.get();
      return docSnap.exists ? docSnap.data() as OfficialResult : undefined;
  },
  publishSessionResults: async (gpId: number, session: 'quali' | 'sprint' | 'race', sessionResults: Partial<Result>, manualOverrides: Partial<OfficialResult['manualOverrides']>) => {
    const [resultsCol, scheduleCol, predictionsCol] = await Promise.all([
        getSeasonCollection('results'),
        getSeasonCollection('schedule'),
        getSeasonCollection('predictions')
    ]);
    if (!resultsCol || !scheduleCol || !predictionsCol) return;

    const batch = firestore.batch();
    const resultRef = resultsCol.doc(String(gpId));
    
    batch.set(resultRef, {
        ...sessionResults, gpId, publishedAt: new Date().toISOString(),
        publishedSessions: firebase.firestore.FieldValue.arrayUnion(session) as any,
        manualOverrides
    }, { merge: true });
    
    const gpSnap = await scheduleCol.doc(String(gpId)).get();
    const gpName = gpSnap.exists ? (gpSnap.data() as GrandPrix).name : `GP ${gpId}`;

    const predictionsSnap = await predictionsCol.where("gpId", "==", gpId).get();
    const userIds = [...new Set(predictionsSnap.docs.map(p => (p.data() as Prediction).userId))];

    for (const userId of userIds) {
        const notifRef = notificationsCol.doc();
        const notification: ResultsNotification = {
            id: notifRef.id, toUserId: userId, type: 'results', gpId, gpName, session,
            timestamp: new Date().toISOString(), seen: false,
        };
        batch.set(notifRef, notification);
    }
    
    await batch.commit();
  },
  publishResult: async (result: OfficialResult): Promise<void> => {
    const [resultsCol, scheduleCol, predictionsCol] = await Promise.all([
        getSeasonCollection('results'),
        getSeasonCollection('schedule'),
        getSeasonCollection('predictions')
    ]);
    if (!resultsCol || !scheduleCol || !predictionsCol) return;

    const batch = firestore.batch();
    const resultRef = resultsCol.doc(String(result.gpId));

    const existingResultSnap = await resultRef.get();
    const existingSessions = (existingResultSnap.data() as OfficialResult | undefined)?.publishedSessions || [];
    const newSessions = result.publishedSessions.filter(s => !existingSessions.includes(s));

    batch.set(resultRef, result, { merge: true });

    if (newSessions.length > 0) {
        const gpSnap = await scheduleCol.doc(String(result.gpId)).get();
        const gpName = gpSnap.exists ? (gpSnap.data() as GrandPrix).name : `GP ${result.gpId}`;

        const predictionsSnap = await predictionsCol.where("gpId", "==", result.gpId).get();
        const userIds = [...new Set(predictionsSnap.docs.map(p => p.data().userId as string))];

        for (const session of newSessions) {
            for (const userId of userIds) {
                const notifRef = notificationsCol.doc();
                const notification: ResultsNotification = {
                    id: notifRef.id, toUserId: userId, type: 'results', gpId: result.gpId, gpName, session,
                    timestamp: new Date().toISOString(), seen: false,
                };
                batch.set(notifRef, notification);
            }
        }
    }
    await batch.commit();
  },


  // Scoring
  calculateGpScore: async (prediction: Prediction, result: OfficialResult): Promise<GpScore | null> => {
    const scheduleCol = await getSeasonCollection('schedule');
    if (!scheduleCol) return null;
    const gpSnap = await scheduleCol.doc(String(result.gpId)).get();
    if (!gpSnap.exists) return null;
    const gp = gpSnap.data() as GrandPrix;
    return engine.calculateGpScore(gp, prediction, result);
  },

  calculateSeasonTotals: async (): Promise<SeasonTotal[]> => {
    const seasonId = await getActiveSeason();
    if (!seasonId) return [];

    const usersSnap = await usersCol.get();
    const [predictionsSnap, resultsSnap, adjustmentsSnap] = await Promise.all([
        firestore.collection(`seasons/${seasonId}/predictions`).get(),
        firestore.collection(`seasons/${seasonId}/results`).get(),
        firestore.collection(`seasons/${seasonId}/pointAdjustments`).orderBy("timestamp", "desc").get(),
    ]);

    const users = usersSnap.docs.map(d => applyUsernameFallback(d.data() as User));
    const allPredictions = predictionsSnap.docs.map(d => d.data() as Prediction);
    const officialResults = resultsSnap.docs.map(d => d.data() as OfficialResult);
    const pointAdjustments = adjustmentsSnap.docs.map(d => d.data() as PointAdjustment);

    return engine.calculateSeasonStandings(users, allPredictions, officialResults, pointAdjustments);
  },

  // Tournaments
  getTournaments: async (): Promise<Tournament[]> => {
      const tournamentsCol = await getSeasonCollection('tournaments');
      if (!tournamentsCol) return [];
      const snapshot = await tournamentsCol.get();
      return snapshot.docs.map(doc => doc.data() as Tournament);
  },
  saveTournament: async (tournament: Tournament): Promise<void> => {
      const tournamentsCol = await getSeasonCollection('tournaments');
      if (!tournamentsCol) return;
      const docRef = tournamentsCol.doc(tournament.id);
      await docRef.set(tournament, { merge: true });
  },
  addTournament: async (tournamentData: Omit<Tournament, 'id' | 'pendingMemberIds'>): Promise<Tournament | null> => {
      const tournamentsCol = await getSeasonCollection('tournaments');
      if (!tournamentsCol) return null;
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
      const tournamentsCol = await getSeasonCollection('tournaments');
      if (!tournamentsCol) return undefined;
      const q = tournamentsCol.where("inviteCode", "==", code).limit(1);
      const snapshot = await q.get();
      if (snapshot.empty) return undefined;
      return snapshot.docs[0].data() as Tournament;
  },
  leaveTournament: async (userId: string, tournamentId: string): Promise<void> => {
    const tournamentsCol = await getSeasonCollection('tournaments');
    if (!tournamentsCol) return;
    const tournamentRef = tournamentsCol.doc(tournamentId);
    await tournamentRef.update({
        memberIds: firebase.firestore.FieldValue.arrayRemove(userId)
    });
  },
  deleteTournament: async (tournamentId: string): Promise<void> => {
      const tournamentsCol = await getSeasonCollection('tournaments');
      if (!tournamentsCol) return;
      const tournamentRef = tournamentsCol.doc(tournamentId);
      await tournamentRef.delete();
  },

  // Notifications & Invites
  listenForNotificationsForUser: (userId: string, onUpdate: (notifications: Notification[]) => void): () => void => {
      const q = notificationsCol.where("toUserId", "==", userId).limit(30);
      const unsubscribe = q.onSnapshot(snapshot => {
          const notifications = snapshot.docs.map(doc => doc.data() as Notification);
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
    const tournamentsCol = await getSeasonCollection('tournaments');
    if (!tournamentsCol) return false;

    const tournamentRef = tournamentsCol.doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();
    if (!tournamentSnap.exists) return false;

    const tournament = tournamentSnap.data() as Tournament;
    if (tournament.memberIds.includes(toUserId) || (tournament.pendingMemberIds && tournament.pendingMemberIds.includes(toUserId))) {
        return false;
    }

    const batch = firestore.batch();
    batch.update(tournamentRef, { pendingMemberIds: firebase.firestore.FieldValue.arrayUnion(toUserId) });
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
    const tournamentsCol = await getSeasonCollection('tournaments');
    if (!tournamentsCol) return null;

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
    const tournamentsCol = await getSeasonCollection('tournaments');
    if (!tournamentsCol) return;

    const tournamentRef = tournamentsCol.doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();
    if (!tournamentSnap.exists) {
        await notificationsCol.doc(notificationId).delete();
        return;
    }
    const tournament = tournamentSnap.data() as Tournament;
    
    const batch = firestore.batch();
    batch.update(tournamentRef, { pendingMemberIds: firebase.firestore.FieldValue.arrayRemove(userId) });
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

  // Pokes (Unaffected by seasons)
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
          .where("type", "==", "poke") // FIX: Changed === to ==
          .where("seen", "==", false)
          .limit(1);
      const snapshot = await q.get();
      if (snapshot.empty) return undefined;
      return snapshot.docs[0].data() as PokeNotification;
  },
  
  // Admin
  getPointAdjustments: async (): Promise<PointAdjustment[]> => {
      const pointAdjustmentsCol = await getSeasonCollection('pointAdjustments');
      if (!pointAdjustmentsCol) return [];
      const q = pointAdjustmentsCol.orderBy("timestamp", "desc");
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as PointAdjustment);
  },
  addPointAdjustment: async (adjustment: Omit<PointAdjustment, 'id' | 'timestamp'>): Promise<void> => {
      const pointAdjustmentsCol = await getSeasonCollection('pointAdjustments');
      if (!pointAdjustmentsCol) return;
      const batch = firestore.batch();
      
      const adjRef = pointAdjustmentsCol.doc();
      const newAdjustment: PointAdjustment = { ...adjustment, id: adjRef.id, timestamp: new Date().toISOString() };
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
      const seasonId = await getActiveSeason();
      if (!seasonId) {
          console.error("SEED FAILED: No active season found to seed data into.");
          return;
      }

      // 1. Clear non-seasonal data
      const collectionsToClear = [usersCol, notificationsCol]; // Removed teamsCol, driversCol
      for (const col of collectionsToClear) {
          const snapshot = await col.get();
          if (snapshot.empty) continue;
          const batch = firestore.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`Cleared non-seasonal collection: ${col.id}`);
      }
      
      // 2. Clear seasonal data from the active season
      const seasonalCollections = ['schedule', 'predictions', 'results', 'tournaments', 'pointAdjustments', 'teams', 'drivers']; // Added teams, drivers
      for (const name of seasonalCollections) {
          const coll = firestore.collection(`seasons/${seasonId}/${name}`);
          const snapshot = await coll.get();
          if (snapshot.empty) continue;
          const batch = firestore.batch();
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`Cleared seasonal collection: seasons/${seasonId}/${name}`);
      }

      // 3. Seed seasonal data into the active season
      const seasonSeedBatch = firestore.batch();
      const scheduleCol = firestore.collection(`seasons/${seasonId}/schedule`);
      const teamsCol = firestore.collection(`seasons/${seasonId}/teams`);
      const driversCol = firestore.collection(`seasons/${seasonId}/drivers`);

      GP_SCHEDULE.forEach(gp => seasonSeedBatch.set(scheduleCol.doc(String(gp.id)), gp));
      TEAMS.forEach(team => seasonSeedBatch.set(teamsCol.doc(team.id), team));
      DRIVERS.forEach(driver => seasonSeedBatch.set(driversCol.doc(driver.id), driver));
      
      await seasonSeedBatch.commit();
      console.log(`Seeded Schedule, Teams, and Drivers into season ${seasonId}.`);

      console.log("NOTE: Test users (e.g., admin@boxbox.com) must be created manually in the Firebase Authentication console.");
      console.log("Firebase seed complete.");
  },
};
