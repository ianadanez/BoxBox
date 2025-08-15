

import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, writeBatch, orderBy, limit } from '@firebase/firestore';
import { firestoreDb } from '../firebaseConfig';
import { User, Team, Driver, GrandPrix, Prediction, OfficialResult, Result, Tournament, Score, SeasonTotal, PointAdjustment, Notification, PokeNotification, TournamentInviteNotification, ResultsNotification, PointsAdjustmentNotification, TournamentInviteAcceptedNotification, TournamentInviteDeclinedNotification } from '../types';
import { TEAMS, DRIVERS, GP_SCHEDULE, SCORING_RULES } from '../constants';

// Collection references
const usersRef = collection(firestoreDb, 'users');
const teamsRef = collection(firestoreDb, 'teams');
const driversRef = collection(firestoreDb, 'drivers');
const scheduleRef = collection(firestoreDb, 'schedule');
const predictionsRef = collection(firestoreDb, 'predictions');
const resultsRef = collection(firestoreDb, 'results');
const tournamentsRef = collection(firestoreDb, 'tournaments');
const pointAdjustmentsRef = collection(firestoreDb, 'pointAdjustments');
const notificationsRef = collection(firestoreDb, 'notifications');


export const db = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },
  getUserByEmail: async (email: string): Promise<User | undefined> => {
    const q = query(usersRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  },
  getUserById: async (id: string): Promise<User | undefined> => {
    const docRef = doc(firestoreDb, 'users', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return { id: docSnap.id, ...docSnap.data() } as User;
  },
  saveUser: async (user: User): Promise<void> => {
    const { id, ...userData } = user;
    await setDoc(doc(firestoreDb, 'users', id), userData);
  },

  // Catalogue
  getTeams: async (): Promise<Team[]> => {
    const snapshot = await getDocs(teamsRef);
    if (snapshot.empty) return TEAMS; // Fallback to constants if collection is empty
    return snapshot.docs.map(doc => doc.data() as Team);
  },
  getDrivers: async (activeOnly = false): Promise<Driver[]> => {
    let q = query(collection(firestoreDb, 'drivers'));
    if (activeOnly) {
        q = query(q, where("isActive", "==", true));
    }
    const snapshot = await getDocs(q);
    if (snapshot.empty) return DRIVERS.filter(d => activeOnly ? d.isActive : true); // Fallback
    return snapshot.docs.map(doc => doc.data() as Driver);
  },
  saveDriver: async (driver: Driver): Promise<void> => {
    await setDoc(doc(firestoreDb, 'drivers', driver.id), driver, { merge: true });
  },
  getSchedule: async (): Promise<GrandPrix[]> => {
    const q = query(scheduleRef, orderBy("id"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return GP_SCHEDULE; // Fallback
    return snapshot.docs.map(doc => doc.data() as GrandPrix).sort((a,b) => a.id - b.id);
  },
  saveGp: async (gp: GrandPrix): Promise<void> => {
     await setDoc(doc(firestoreDb, 'schedule', String(gp.id)), gp, { merge: true });
  },
  replaceSchedule: async (newSchedule: GrandPrix[]): Promise<void> => {
      const batch = writeBatch(firestoreDb);
      newSchedule.forEach(gp => {
          const docRef = doc(firestoreDb, 'schedule', String(gp.id));
          batch.set(docRef, gp);
      });
      await batch.commit();
  },

  // Predictions
  getPrediction: async (userId: string, gpId: number): Promise<Prediction | undefined> => {
    const q = query(predictionsRef, where("userId", "==", userId), where("gpId", "==", gpId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data() as Prediction;
  },
  savePrediction: async (prediction: Prediction): Promise<void> => {
    const { userId, gpId } = prediction;
    const docId = `${userId}_${gpId}`;
    const predToSave = { ...prediction, submittedAt: new Date().toISOString() };
    await setDoc(doc(predictionsRef, docId), predToSave, { merge: true });
  },
  
  // Results
  getDraftResult: async (gpId: number): Promise<Result | undefined> => {
    const docRef = doc(firestoreDb, 'results', `draft_${gpId}`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Result : undefined;
  },
  saveDraftResult: async (result: Result): Promise<void> => {
    await setDoc(doc(firestoreDb, 'results', `draft_${result.gpId}`), result);
  },
  getOfficialResult: async (gpId: number): Promise<OfficialResult | undefined> => {
    const docRef = doc(firestoreDb, 'results', `official_${gpId}`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as OfficialResult : undefined;
  },
  getOfficialResults: async (): Promise<OfficialResult[]> => {
    const q = query(resultsRef, where("publishedAt", "!=", null));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as OfficialResult);
  },
  publishResult: async (result: OfficialResult): Promise<void> => {
     const resultToSave = { ...result, publishedAt: new Date().toISOString() };
     await setDoc(doc(firestoreDb, 'results', `official_${result.gpId}`), resultToSave, { merge: true });
     
     // Create notifications
     const schedule = await db.getSchedule();
     const gp = schedule.find(g => g.id === result.gpId);
     const q = query(predictionsRef, where("gpId", "==", result.gpId));
     const usersWhoPredictedSnapshot = await getDocs(q);
     
     const batch = writeBatch(firestoreDb);
     usersWhoPredictedSnapshot.docs.forEach(predDoc => {
         const userId = predDoc.data().userId;
         const notifRef = doc(collection(firestoreDb, 'notifications'));
         const notification: Omit<ResultsNotification, 'id'> = {
             toUserId: userId, type: 'results',
             gpId: result.gpId, gpName: gp?.name || 'una carrera',
             timestamp: new Date().toISOString(), seen: false
         };
         batch.set(notifRef, notification);
     });
     await batch.commit();
  },

  // Tournaments
  getTournaments: async (): Promise<Tournament[]> => {
    const snapshot = await getDocs(tournamentsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
  },
  saveTournament: async (tournament: Tournament): Promise<void> => {
      const { id, ...tourneyData } = tournament;
      await setDoc(doc(tournamentsRef, id), tourneyData, { merge: true });
  },
  addTournament: async (data: Omit<Tournament, 'id'| 'pendingMemberIds'>): Promise<Tournament> => {
      const newTournamentData = { ...data, pendingMemberIds: [] };
      const docRef = await addDoc(tournamentsRef, newTournamentData);
      return { id: docRef.id, ...newTournamentData };
  },
  findTournamentByCode: async (code: string): Promise<Tournament | undefined> => {
      const q = query(tournamentsRef, where("inviteCode", "==", code));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Tournament;
  },

  // Point Adjustments
  getPointAdjustments: async (): Promise<PointAdjustment[]> => {
    const q = query(pointAdjustmentsRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PointAdjustment));
  },
  addPointAdjustment: async (data: Omit<PointAdjustment, 'id' | 'timestamp'>): Promise<PointAdjustment> => {
      const newAdjustmentData = { ...data, timestamp: new Date().toISOString() };
      const docRef = await addDoc(pointAdjustmentsRef, newAdjustmentData);
      
      const notifRef = doc(notificationsRef);
      const notification: Omit<PointsAdjustmentNotification, 'id'> = {
          toUserId: data.userId, type: 'points_adjustment', points: data.points,
          reason: data.reason, adminId: data.adminId, timestamp: new Date().toISOString(), seen: false
      };
      await setDoc(notifRef, notification);
      
      return { id: docRef.id, ...newAdjustmentData };
  },

  // Notifications
  getExistingUnseenPoke: async (fromUserId: string, toUserId: string): Promise<PokeNotification | undefined> => {
    const q = query(notificationsRef, 
      where('type', '==', 'poke'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId),
      where('seen', '==', false),
      limit(1)
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
    const docRef = await addDoc(notificationsRef, newPokeData);
    return { id: docRef.id, ...newPokeData };
  },
  sendTournamentInvite: async (fromUserId: string, toUserId: string, tournamentId: string, tournamentName: string): Promise<Notification | null> => {
    const tournamentRef = doc(tournamentsRef, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);
    if (!tournamentSnap.exists()) return null;
    const tournament = tournamentSnap.data() as Tournament;

    if (tournament.memberIds.includes(toUserId) || tournament.pendingMemberIds.includes(toUserId)) {
        return null;
    }
    
    const newPendingMembers = [...tournament.pendingMemberIds, toUserId];
    await setDoc(tournamentRef, { pendingMemberIds: newPendingMembers }, { merge: true });
    
    const newInviteData: Omit<TournamentInviteNotification, 'id'> = {
        type: 'tournament_invite', fromUserId, toUserId, tournamentId, tournamentName,
        timestamp: new Date().toISOString(), seen: false,
    };
    const docRef = await addDoc(notificationsRef, newInviteData);
    return { id: docRef.id, ...newInviteData };
  },
  acceptTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<Tournament | null> => {
    const tournamentRef = doc(tournamentsRef, tournamentId);
    const tournamentSnap = await getDoc(tournamentRef);
    if (!tournamentSnap.exists()) return null;
    let tournament = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;

    const batch = writeBatch(firestoreDb);
    
    const pendingMemberIds = tournament.pendingMemberIds.filter(id => id !== userId);
    const memberIds = tournament.memberIds.includes(userId) ? tournament.memberIds : [...tournament.memberIds, userId];
    batch.update(tournamentRef, { pendingMemberIds, memberIds });
    
    const notificationRef = doc(notificationsRef, notificationId);
    batch.update(notificationRef, { seen: true });
    
    const acceptanceNotificationRef = doc(notificationsRef);
    const acceptanceNotification: Omit<TournamentInviteAcceptedNotification, 'id'> = {
        type: 'tournament_invite_accepted', toUserId: tournament.creatorId, fromUserId: userId,
        tournamentId: tournament.id, tournamentName: tournament.name, timestamp: new Date().toISOString(), seen: false,
    };
    batch.set(acceptanceNotificationRef, acceptanceNotification);

    await batch.commit();
    return { ...tournament, memberIds, pendingMemberIds };
  },
  declineTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<void> => {
      const tournamentRef = doc(tournamentsRef, tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);
      if (!tournamentSnap.exists()) return;
      const tournament = tournamentSnap.data() as Tournament;

      const batch = writeBatch(firestoreDb);
      
      const pendingMemberIds = tournament.pendingMemberIds.filter(id => id !== userId);
      batch.update(tournamentRef, { pendingMemberIds });

      const notificationRef = doc(notificationsRef, notificationId);
      batch.update(notificationRef, { seen: true });

      const declineNotificationRef = doc(notificationsRef);
      const declineNotification: Omit<TournamentInviteDeclinedNotification, 'id'> = {
          type: 'tournament_invite_declined', toUserId: tournament.creatorId, fromUserId: userId,
          tournamentId, tournamentName: tournament.name, timestamp: new Date().toISOString(), seen: false,
      };
      batch.set(declineNotificationRef, declineNotification);
      
      await batch.commit();
  },
  getNotificationsForUser: async (toUserId: string): Promise<Notification[]> => {
    const q = query(notificationsRef, where("toUserId", "==", toUserId), where("seen", "==", false), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  },
  markNotificationsAsSeen: async (notificationIds: string[]): Promise<void> => {
    const batch = writeBatch(firestoreDb);
    notificationIds.forEach(id => {
        batch.update(doc(notificationsRef, id), { seen: true });
    });
    await batch.commit();
  },
  
  // Scoring Logic (now uses Firestore data)
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
      const [allUsers, allOfficialResults, allPredictionsDocs, allAdjustments] = await Promise.all([
          db.getUsers(),
          db.getOfficialResults(),
          getDocs(predictionsRef),
          db.getPointAdjustments()
      ]);
      const allPredictions = allPredictionsDocs.docs.map(d => d.data() as Prediction);
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
  
  seedDatabase: async (): Promise<void> => {
    const batch = writeBatch(firestoreDb);

    TEAMS.forEach(team => batch.set(doc(teamsRef, team.id), team));
    DRIVERS.forEach(driver => batch.set(doc(driversRef, driver.id), driver));
    GP_SCHEDULE.forEach(gp => batch.set(doc(scheduleRef, String(gp.id)), gp));

    // Clear existing data (optional, but good for a clean seed)
    // Note: Deleting collections client-side is complex. This seed should be run on an empty DB.
    
    // For now, we just overwrite.
    await batch.commit();
  }
};