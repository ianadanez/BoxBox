

import { User, Team, Driver, GrandPrix, Prediction, OfficialResult, Result, Tournament, Score, SeasonTotal, PointAdjustment, Notification, PokeNotification, TournamentInviteNotification, ResultsNotification, PointsAdjustmentNotification, TournamentInviteAcceptedNotification, TournamentInviteDeclinedNotification } from '../types';
import { TEAMS, DRIVERS, GP_SCHEDULE, SCORING_RULES } from '../constants';
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
  getUserByEmail: async (email: string): Promise<User | undefined> => {
      // FIX: Use compat API `where()` and `get()` methods.
      const q = usersCol.where("email", "==", email);
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
      