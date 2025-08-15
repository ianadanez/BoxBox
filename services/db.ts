

import { User, Team, Driver, GrandPrix, Prediction, OfficialResult, Result, Tournament, Score, SeasonTotal, PointAdjustment, Notification, PokeNotification, TournamentInviteNotification, ResultsNotification, PointsAdjustmentNotification, TournamentInviteAcceptedNotification, TournamentInviteDeclinedNotification } from '../types';
import { TEAMS, DRIVERS, GP_SCHEDULE, SCORING_RULES } from '../constants';
import { firestoreDb as firestore } from '../firebaseConfig';
import { 
    collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, 
    writeBatch, query, where, documentId, orderBy, deleteDoc, collectionGroup
} from 'firebase/firestore';

// --- Collection References ---
const usersCol = collection(firestore, 'users');
const teamsCol = collection(firestore, 'teams');
const driversCol = collection(firestore, 'drivers');
const scheduleCol = collection(firestore, 'schedule');
const predictionsCol = collection(firestore, 'predictions');
const resultsCol = collection(firestore, 'results');
const draftResultsCol = collection(firestore, 'draft_results');
const tournamentsCol = collection(firestore, 'tournaments');
const pointAdjustmentsCol = collection(firestore, 'pointAdjustments');
const notificationsCol = collection(firestore, 'notifications');


// --- Firestore DB Service Implementation ---
export const db = {
  // Users
  getUsers: async (): Promise<User[]> => {
      const snapshot = await getDocs(usersCol);
      return snapshot.docs.map(doc => doc.data() as User);
  },
  getUserByEmail: async (email: string): Promise<User | undefined> => {
      const q = query(usersCol, where("email", "==", email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return undefined;
      return snapshot.docs[0].data() as User;
  },
  getUserById: async (id: string): Promise<User | undefined> => {
      const docRef = doc(firestore, 'users', id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as User : undefined;
  },
  saveUser: async (user: User): Promise<void> => {
      const { password, ...userData } = user; // Never store password in Firestore
      const docRef = doc(firestore, 'users', user.id);
      await setDoc(docRef, userData, { merge: true });
  },

  // Catalogue
  getTeams: async (): Promise<Team[]> => {
      const snapshot = await getDocs(teamsCol);
      return snapshot.docs.map(doc => doc.data() as Team);
  },
  getDrivers: async (activeOnly = false): Promise<Driver[]> => {
      const q = activeOnly ? query(driversCol, where("isActive", "==", true)) : driversCol;
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Driver);
  },
  saveDriver: async (driver: Driver): Promise<void> => {
      const docRef = doc(firestore, 'drivers', driver.id);
      await setDoc(docRef, driver, { merge: true });
  },
  getSchedule: async (): Promise<GrandPrix[]> => {
      const q = query(scheduleCol, orderBy("id"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as GrandPrix);
  },
  saveGp: async (gp: GrandPrix): Promise<void> => {
      const docRef = doc(firestore, 'schedule', String(gp.id));
      await setDoc(docRef, gp, { merge: true });
  },
  replaceSchedule: async (newSchedule: GrandPrix[]): Promise<void> => {
      const batch = writeBatch(firestore);
      const currentSchedule = await getDocs(scheduleCol);
      currentSchedule.forEach(doc => batch.delete(doc.ref));
      newSchedule.forEach(gp => {
          const docRef = doc(firestore, 'schedule', String(gp.id));
          batch.set(docRef, gp);
      });
      await batch.commit();
  },

  // Predictions
  getPrediction: async (userId: string, gpId: number): Promise<Prediction | undefined> => {
      const predId = `${userId}_${gpId}`;
      const docRef = doc(firestore, 'predictions', predId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as Prediction : undefined;
  },
  savePrediction: async (prediction: Prediction): Promise<void> => {
      const predToSave = { ...prediction, submittedAt: new Date().toISOString() };
      const predId = `${prediction.userId}_${prediction.gpId}`;
      const docRef = doc(firestore, 'predictions', predId);
      await setDoc(docRef, predToSave, { merge: true });
  },
  
  // Results
  getDraftResult: async (gpId: number): Promise<Result | undefined> => {
    const docRef = doc(firestore, 'draft_results', String(gpId));
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Result : undefined;
  },
  saveDraftResult: async (result: Result): Promise<void> => {
    const docRef = doc(firestore, 'draft_results', String(result.gpId));
    await setDoc(docRef, result, { merge: true });
  },
  getOfficialResult: async (gpId: number): Promise<OfficialResult | undefined> => {
    const docRef = doc(firestore, 'results', String(gpId));
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as OfficialResult : undefined;
  },
  getOfficialResults: async (): Promise<OfficialResult[]> => {
    const snapshot = await getDocs(resultsCol);
    return snapshot.docs.map(doc => doc.data() as OfficialResult);
  },
  publishResult: async (result: OfficialResult): Promise<void> => {
     const resultToSave = { ...result, publishedAt: new Date().toISOString() };
     const docRef = doc(firestore, 'results', String(result.gpId));
     await setDoc(docRef, resultToSave, { merge: true });
     
     // Notify users who made a prediction for this GP
     const q = query(predictionsCol, where("gpId", "==", result.gpId));
     const predictionsSnapshot = await getDocs(q);
     const usersWhoPredicted = [...new Set(predictionsSnapshot.docs.map(d => (d.data() as Prediction).userId))];
     
     const schedule = await db.getSchedule();
     const gp = schedule.find(g => g.id === result.gpId);

     const batch = writeBatch(firestore);
     usersWhoPredicted.forEach(userId => {
         const notification: Omit<ResultsNotification, 'id'> = {
             toUserId: userId, type: 'results',
             gpId: result.gpId, gpName: gp?.name || 'a race',
             timestamp: new Date().toISOString(), seen: false
         };
         const notifRef = doc(collection(firestore, 'notifications'));
         batch.set(notifRef, notification);
     });
     await batch.commit();
  },

  // Tournaments
  getTournaments: async (): Promise<Tournament[]> => {
      const snapshot = await getDocs(tournamentsCol);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
  },
  saveTournament: async (tournament: Tournament): Promise<void> => {
      const { id, ...data } = tournament;
      const docRef = doc(firestore, 'tournaments', id);
      await setDoc(docRef, data, { merge: true });
  },
  addTournament: async (data: Omit<Tournament, 'id' | 'pendingMemberIds'>): Promise<Tournament> => {
      const newTournamentData = { ...data, pendingMemberIds: [] };
      const docRef = await addDoc(tournamentsCol, newTournamentData);
      return { id: docRef.id, ...newTournamentData };
  },
  findTournamentByCode: async (code: string): Promise<Tournament | undefined> => {
      const q = query(tournamentsCol, where("inviteCode", "==", code));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Tournament;
  },

  // Point Adjustments
  getPointAdjustments: async (): Promise<PointAdjustment[]> => {
      const q = query(pointAdjustmentsCol, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PointAdjustment));
  },
  addPointAdjustment: async (data: Omit<PointAdjustment, 'id' | 'timestamp'>): Promise<PointAdjustment> => {
      const newAdjustmentData = { ...data, timestamp: new Date().toISOString() };
      const docRef = await addDoc(pointAdjustmentsCol, newAdjustmentData);
      
      const notification: Omit<PointsAdjustmentNotification, 'id'> = {
          toUserId: data.userId, type: 'points_adjustment', points: data.points,
          reason: data.reason, adminId: data.adminId, timestamp: new Date().toISOString(), seen: false
      };
      await addDoc(notificationsCol, notification);
      
      return { id: docRef.id, ...newAdjustmentData };
  },

  // Notifications
  getExistingUnseenPoke: async (fromUserId: string, toUserId: string): Promise<PokeNotification | undefined> => {
      const q = query(notificationsCol, 
          where("toUserId", "==", toUserId), 
          where("fromUserId", "==", fromUserId),
          where("type", "==", "poke"),
          where("seen", "==", false)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PokeNotification;
  },
  addPoke: async (fromUserId: string, toUserId: string): Promise<Notification> => {
      const newPokeData: Omit<PokeNotification, 'id'> = {
          type: 'poke', fromUserId, toUserId, timestamp: new Date().toISOString(), seen: false,
      };
      const docRef = await addDoc(notificationsCol, newPokeData);
      return { id: docRef.id, ...newPokeData };
  },
  sendTournamentInvite: async (fromUserId: string, toUserId: string, tournamentId: string, tournamentName: string): Promise<Notification | null> => {
      const tournamentRef = doc(firestore, 'tournaments', tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);
      if (!tournamentSnap.exists()) return null;
      const tournament = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;
      
      if (tournament.memberIds.includes(toUserId) || tournament.pendingMemberIds.includes(toUserId)) {
          return null;
      }
      
      tournament.pendingMemberIds.push(toUserId);
      await db.saveTournament(tournament);

      const newInviteData: Omit<TournamentInviteNotification, 'id'> = {
          type: 'tournament_invite', fromUserId, toUserId, tournamentId, tournamentName,
          timestamp: new Date().toISOString(), seen: false,
      };
      const docRef = await addDoc(notificationsCol, newInviteData);
      return { id: docRef.id, ...newInviteData };
  },
  acceptTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<Tournament | null> => {
      const tournamentRef = doc(firestore, 'tournaments', tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);
      if (!tournamentSnap.exists()) return null;
      const tournament = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;
      
      tournament.pendingMemberIds = tournament.pendingMemberIds.filter(id => id !== userId);
      if (!tournament.memberIds.includes(userId)) {
          tournament.memberIds.push(userId);
      }
      await db.saveTournament(tournament);

      const batch = writeBatch(firestore);
      const inviteNotifRef = doc(firestore, 'notifications', notificationId);
      batch.update(inviteNotifRef, { seen: true });

      const acceptanceNotificationData: Omit<TournamentInviteAcceptedNotification, 'id'> = {
          type: 'tournament_invite_accepted', toUserId: tournament.creatorId, fromUserId: userId,
          tournamentId: tournament.id, tournamentName: tournament.name, timestamp: new Date().toISOString(), seen: false,
      };
      const newNotifRef = doc(notificationsCol);
      batch.set(newNotifRef, acceptanceNotificationData);
      await batch.commit();
      
      return tournament;
  },
  declineTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<void> => {
      const tournamentRef = doc(firestore, 'tournaments', tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);
      if (!tournamentSnap.exists()) return;
      const tournament = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;

      tournament.pendingMemberIds = tournament.pendingMemberIds.filter(id => id !== userId);
      await db.saveTournament(tournament);
      
      const batch = writeBatch(firestore);
      const inviteNotifRef = doc(firestore, 'notifications', notificationId);
      batch.update(inviteNotifRef, { seen: true });
      
      const declineNotificationData: Omit<TournamentInviteDeclinedNotification, 'id'> = {
          type: 'tournament_invite_declined', toUserId: tournament.creatorId, fromUserId: userId,
          tournamentId, tournamentName: tournament.name, timestamp: new Date().toISOString(), seen: false,
      };
      const newNotifRef = doc(notificationsCol);
      batch.set(newNotifRef, declineNotificationData);
      await batch.commit();
  },
  getNotificationsForUser: async (toUserId: string): Promise<Notification[]> => {
      const q = query(notificationsCol, 
          where("toUserId", "==", toUserId), 
          where("seen", "==", false),
          orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  },
  markNotificationsAsSeen: async (notificationIds: string[]): Promise<void> => {
      if (notificationIds.length === 0) return;
      const batch = writeBatch(firestore);
      notificationIds.forEach(id => {
          const docRef = doc(firestore, 'notifications', id);
          batch.update(docRef, { seen: true });
      });
      await batch.commit();
  },
  
  // Scoring Logic
  calculateGpScores: (gpId: number, officialResult: OfficialResult, allPredictions: Prediction[]): Score[] => {
    if (!officialResult) return [];
    const gpPredictions = allPredictions.filter(p => p.gpId === gpId);
    const scores: Score[] = [];
    gpPredictions.forEach(p => {
        const score: Score = {
            userId: p.userId, gpId, totalPoints: 0,
            breakdown: { pole: 0, sprintPole: 0, sprintPodium: 0, racePodium: 0, fastestLap: 0, driverOfTheDay: 0 }
        };
        if (officialResult.pole && p.pole === officialResult.pole) score.breakdown.pole = SCORING_RULES.pole;
        if (officialResult.sprintPole && p.sprintPole === officialResult.sprintPole) score.breakdown.sprintPole = SCORING_RULES.sprintPole;
        if(officialResult.sprintPodium && p.sprintPodium) {
            p.sprintPodium.forEach((driverId, i) => {
                if(driverId === officialResult.sprintPodium?.[i]) score.breakdown.sprintPodium += SCORING_RULES.sprintPodium[('p'+(i+1)) as 'p1'|'p2'|'p3'];
                else if (officialResult.sprintPodium?.includes(driverId)) score.breakdown.sprintPodium += SCORING_RULES.sprintPodium.inPodium;
            });
        }
        if(officialResult.racePodium && p.racePodium) {
            p.racePodium.forEach((driverId, i) => {
                if(driverId === officialResult.racePodium?.[i]) score.breakdown.racePodium += SCORING_RULES.racePodium[('p'+(i+1)) as 'p1'|'p2'|'p3'];
                else if (officialResult.racePodium?.includes(driverId)) score.breakdown.racePodium += SCORING_RULES.racePodium.inPodium;
            });
        }
        if (officialResult.fastestLap && p.fastestLap === officialResult.fastestLap) score.breakdown.fastestLap = SCORING_RULES.fastestLap;
        if (officialResult.driverOfTheDay && p.driverOfTheDay === officialResult.driverOfTheDay) score.breakdown.driverOfTheDay = SCORING_RULES.driverOfTheDay;
        score.totalPoints = Object.values(score.breakdown).reduce((a, b) => a + b, 0);
        scores.push(score);
    });
    return scores;
  },
  calculateSeasonTotals: async (): Promise<SeasonTotal[]> => {
      const [allUsers, allOfficialResults, allPredictionsSnapshot, allAdjustments] = await Promise.all([
          db.getUsers(),
          db.getOfficialResults(),
          getDocs(predictionsCol),
          db.getPointAdjustments()
      ]);
      const allPredictions = allPredictionsSnapshot.docs.map(d => d.data() as Prediction);
      const totals: Map<string, SeasonTotal> = new Map();
      allUsers.forEach(user => {
          totals.set(user.id, {
              userId: user.id, userName: user.name, userAvatar: user.avatar, totalPoints: 0,
              details: { exactP1: 0, exactPole: 0, exactFastestLap: 0 }, pointAdjustments: []
          });
      });
      allOfficialResults.forEach(result => {
          const gpScores = db.calculateGpScores(result.gpId, result, allPredictions);
          gpScores.forEach(gpScore => {
              const userTotal = totals.get(gpScore.userId);
              if (userTotal) {
                  userTotal.totalPoints += gpScore.totalPoints;
                  const userPrediction = allPredictions.find(p => p.userId === gpScore.userId && p.gpId === result.gpId);
                  if (userPrediction) {
                      if (result.pole && userPrediction.pole === result.pole) userTotal.details.exactPole++;
                      if (result.racePodium && userPrediction.racePodium?.[0] === result.racePodium[0]) userTotal.details.exactP1++;
                      if (result.fastestLap && userPrediction.fastestLap === result.fastestLap) userTotal.details.exactFastestLap++;
                  }
              }
          });
      });
      allAdjustments.forEach(adj => {
          const userTotal = totals.get(adj.userId);
          if (userTotal) {
              userTotal.totalPoints += adj.points;
              userTotal.pointAdjustments?.push(adj);
          }
      });
      return Array.from(totals.values()).sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          if (b.details.exactP1 !== a.details.exactP1) return b.details.exactP1 - a.details.exactP1;
          if (b.details.exactPole !== a.details.exactPole) return b.details.exactPole - a.details.exactPole;
          if (b.details.exactFastestLap !== a.details.exactFastestLap) return b.details.exactFastestLap - a.details.exactFastestLap;
          return a.userName.localeCompare(b.userName);
      });
  },
  
  seedFirebase: async (): Promise<void> => {
    console.log("Seeding Firebase with initial data...");
    const batch = writeBatch(firestore);
    
     // Static Data
    TEAMS.forEach(team => batch.set(doc(firestore, "teams", team.id), team));
    DRIVERS.forEach(driver => batch.set(doc(firestore, "drivers", driver.id), driver));
    GP_SCHEDULE.forEach(gp => batch.set(doc(firestore, "schedule", String(gp.id)), gp));

    // Test Users
    const adminUser: User = { id: 'admin-user-id', name: 'Admin', email: 'admin@boxbox.com', role: 'admin', avatar: { color: '#E10600', secondaryColor: '#FFFFFF', skinColor: '#D0A17D', eyes: 'laser', pattern: 'carbon' }, favoriteTeamId: 'ferrari', createdAt: new Date().toISOString() };
    const testUser1: User = { id: 'test-user-1-id', name: 'Carlos', email: 'user1@boxbox.com', role: 'user', avatar: { color: '#F91536', secondaryColor: '#FFEB00', skinColor: '#C68642', eyes: 'determined', pattern: 'flames' }, favoriteTeamId: 'ferrari', createdAt: new Date().toISOString() };
    const testUser2: User = { id: 'test-user-2-id', name: 'Lando', email: 'user2@boxbox.com', role: 'user', avatar: { color: '#F58020', secondaryColor: '#00D2FF', skinColor: '#E6A86F', eyes: 'wink', pattern: 'halftone' }, favoriteTeamId: 'mclaren', createdAt: new Date().toISOString() };

    batch.set(doc(firestore, "users", adminUser.id), adminUser);
    batch.set(doc(firestore, "users", testUser1.id), testUser1);
    batch.set(doc(firestore, "users", testUser2.id), testUser2);

    await batch.commit();
    console.log("Firebase seeding complete.");
  }
};


// --- MIGRATION LOGIC ---

// Helper to get data from localStorage, used ONLY for migration.
const getDataForMigration = <T>(key: string, defaultValue: T): T => {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) return JSON.parse(storedValue);
    } catch (error) { console.error(`Migration Error: Could not read "${key}"`, error); }
    return defaultValue;
};

export const migrateLocalStorageToFirebase = async () => {
    if (!window.confirm("¿Estás seguro de que quieres migrar todos los datos de LocalStorage a Firebase? Esto puede sobrescribir datos existentes en Firebase.")) {
        console.log("Migración cancelada por el usuario.");
        return;
    }
    console.log("Iniciando migración de LocalStorage a Firebase...");
    const batch = writeBatch(firestore);

    try {
        // Static Data
        TEAMS.forEach(team => batch.set(doc(firestore, "teams", team.id), team));
        DRIVERS.forEach(driver => batch.set(doc(firestore, "drivers", driver.id), driver));
        GP_SCHEDULE.forEach(gp => batch.set(doc(firestore, "schedule", String(gp.id)), gp));
        console.log("Datos estáticos (equipos, pilotos, calendario) preparados.");

        // Users
        const localUsers = getDataForMigration<User[]>('users', []);
        localUsers.forEach(user => {
            const { password, ...userData } = user; // Do not migrate passwords
            batch.set(doc(firestore, "users", user.id), userData);
        });
        console.log(`Preparados ${localUsers.length} usuarios.`);

        // Dynamic Data
        const collectionsToMigrate = ['predictions', 'results', 'tournaments', 'pointAdjustments', 'notifications'];
        for (const key of collectionsToMigrate) {
            const data = getDataForMigration<any[]>(key, []);
            data.forEach(item => {
                let id = item.id;
                if (key === 'predictions') id = `${item.userId}_${item.gpId}`;
                else if (key === 'results') id = String(item.gpId);
                
                if (!id) {
                    // For items without a clear ID like notifications, generate a new one
                    const docRef = doc(collection(firestore, key));
                    batch.set(docRef, item);
                } else {
                    const { id: itemId, ...itemData } = item;
                    batch.set(doc(firestore, key, id), key === 'results' ? item : itemData);
                }
            });
            console.log(`Preparados ${data.length} documentos para la colección '${key}'.`);
        }
        
        await batch.commit();
        console.log("%c¡Migración completada con éxito!", "color: lightgreen; font-size: 20px;");
        alert("¡Migración completada con éxito!");

    } catch (error) {
        console.error("ERROR DURANTE LA MIGRACIÓN:", error);
        alert(`La migración falló. Revisa la consola para más detalles. Error: ${error}`);
    }
};
