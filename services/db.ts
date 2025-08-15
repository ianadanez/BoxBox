import { User, Team, Driver, GrandPrix, Prediction, OfficialResult, Result, Tournament, Score, SeasonTotal, PointAdjustment, Notification, PokeNotification, TournamentInviteNotification, ResultsNotification, PointsAdjustmentNotification, TournamentInviteAcceptedNotification, TournamentInviteDeclinedNotification } from '../types';
import { TEAMS, DRIVERS, GP_SCHEDULE, SCORING_RULES } from '../constants';

// --- Local Storage Wrapper ---
const getData = <T>(key: string, defaultValue: T): T => {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue) {
            return JSON.parse(storedValue);
        }
    } catch (error) {
        console.error(`Error reading from localStorage for key "${key}":`, error);
    }
    return defaultValue;
};

const saveData = <T>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage for key "${key}":`, error);
    }
};

// --- Initial Data Seeding ---
const seedDatabase = (): void => {
    if (!localStorage.getItem('seeded')) {
        console.log("Database appears to be empty. Seeding initial data into localStorage...");
        const adminUser: User = {
            id: 'admin-user-id',
            name: 'Admin',
            email: 'admin@boxbox.com',
            password: 'password', // Unsafe, for demo only
            role: 'admin',
            avatar: { color: '#E10600', secondaryColor: '#FFFFFF', skinColor: '#D0A17D', eyes: 'laser', pattern: 'carbon' },
            favoriteTeamId: 'ferrari',
            createdAt: new Date().toISOString()
        };
        const testUser1: User = {
            id: 'test-user-1-id',
            name: 'Carlos',
            email: 'user1@boxbox.com',
            password: 'password',
            role: 'user',
            avatar: { color: '#F91536', secondaryColor: '#FFEB00', skinColor: '#C68642', eyes: 'determined', pattern: 'flames' },
            favoriteTeamId: 'ferrari',
            createdAt: new Date().toISOString()
        };
        const testUser2: User = {
            id: 'test-user-2-id',
            name: 'Lando',
            email: 'user2@boxbox.com',
            password: 'password',
            role: 'user',
            avatar: { color: '#F58020', secondaryColor: '#00D2FF', skinColor: '#E6A86F', eyes: 'wink', pattern: 'halftone' },
            favoriteTeamId: 'mclaren',
            createdAt: new Date().toISOString()
        };

        saveData<User[]>('users', [adminUser, testUser1, testUser2]);
        saveData<Team[]>('teams', TEAMS);
        saveData<Driver[]>('drivers', DRIVERS);
        saveData<GrandPrix[]>('schedule', GP_SCHEDULE);
        saveData<Prediction[]>('predictions', []);
        saveData<OfficialResult[]>('results', []);
        saveData<Tournament[]>('tournaments', []);
        saveData<PointAdjustment[]>('pointAdjustments', []);
        saveData<Notification[]>('notifications', []);
        
        localStorage.setItem('seeded', 'true');
        console.log('Seeding complete.');
    }
};

seedDatabase(); // Run on initial load

// --- DB Service Implementation ---
export const db = {
  // Users
  getUsers: async (): Promise<User[]> => getData<User[]>('users', []),
  getUserByEmail: async (email: string): Promise<User | undefined> => {
      const users = await db.getUsers();
      return users.find(u => u.email === email);
  },
  getUserById: async (id: string): Promise<User | undefined> => {
      const users = await db.getUsers();
      return users.find(u => u.id === id);
  },
  saveUser: async (user: User): Promise<void> => {
      const users = await db.getUsers();
      const index = users.findIndex(u => u.id === user.id);
      if (index > -1) {
          users[index] = user;
      } else {
          users.push(user);
      }
      saveData('users', users);
  },

  // Catalogue
  getTeams: async (): Promise<Team[]> => getData('teams', TEAMS),
  getDrivers: async (activeOnly = false): Promise<Driver[]> => {
      const drivers = getData('drivers', DRIVERS);
      return activeOnly ? drivers.filter(d => d.isActive) : drivers;
  },
  saveDriver: async (driver: Driver): Promise<void> => {
      const drivers = await db.getDrivers();
      const index = drivers.findIndex(d => d.id === driver.id);
      if (index > -1) {
          drivers[index] = driver;
      } else {
          drivers.push(driver);
      }
      saveData('drivers', drivers);
  },
  getSchedule: async (): Promise<GrandPrix[]> => getData('schedule', GP_SCHEDULE),
  saveGp: async (gp: GrandPrix): Promise<void> => {
      const schedule = await db.getSchedule();
      const index = schedule.findIndex(g => g.id === gp.id);
      if (index > -1) {
          schedule[index] = gp;
      } else {
          schedule.push(gp);
      }
      saveData('schedule', schedule.sort((a,b) => a.id - b.id));
  },
  replaceSchedule: async (newSchedule: GrandPrix[]): Promise<void> => {
      saveData('schedule', newSchedule);
  },

  // Predictions
  getPrediction: async (userId: string, gpId: number): Promise<Prediction | undefined> => {
      const predictions = getData<Prediction[]>('predictions', []);
      return predictions.find(p => p.userId === userId && p.gpId === gpId);
  },
  savePrediction: async (prediction: Prediction): Promise<void> => {
      const predictions = getData<Prediction[]>('predictions', []);
      const predToSave = { ...prediction, submittedAt: new Date().toISOString() };
      const index = predictions.findIndex(p => p.userId === prediction.userId && p.gpId === prediction.gpId);
      if (index > -1) {
          predictions[index] = predToSave;
      } else {
          predictions.push(predToSave);
      }
      saveData('predictions', predictions);
  },
  
  // Results
  getDraftResult: async (gpId: number): Promise<Result | undefined> => {
    const drafts = getData<{[key: number]: Result}>('draft_results', {});
    return drafts[gpId];
  },
  saveDraftResult: async (result: Result): Promise<void> => {
    const drafts = getData<{[key: number]: Result}>('draft_results', {});
    drafts[result.gpId] = result;
    saveData('draft_results', drafts);
  },
  getOfficialResult: async (gpId: number): Promise<OfficialResult | undefined> => {
      const results = await db.getOfficialResults();
      return results.find(r => r.gpId === gpId);
  },
  getOfficialResults: async (): Promise<OfficialResult[]> => getData('results', []),
  publishResult: async (result: OfficialResult): Promise<void> => {
     const results = await db.getOfficialResults();
     const resultToSave = { ...result, publishedAt: new Date().toISOString() };
     const index = results.findIndex(r => r.gpId === result.gpId);
     if (index > -1) {
         results[index] = resultToSave;
     } else {
         results.push(resultToSave);
     }
     saveData('results', results);
     
     const schedule = await db.getSchedule();
     const gp = schedule.find(g => g.id === result.gpId);
     const allPredictions = getData<Prediction[]>('predictions', []);
     const usersWhoPredicted = [...new Set(allPredictions.filter(p => p.gpId === result.gpId).map(p => p.userId))];

     const notifications = getData<Notification[]>('notifications', []);
     usersWhoPredicted.forEach(userId => {
         const notification: ResultsNotification = {
             id: crypto.randomUUID(),
             toUserId: userId, type: 'results',
             gpId: result.gpId, gpName: gp?.name || 'una carrera',
             timestamp: new Date().toISOString(), seen: false
         };
         notifications.push(notification);
     });
     saveData('notifications', notifications);
  },

  // Tournaments
  getTournaments: async (): Promise<Tournament[]> => getData('tournaments', []),
  saveTournament: async (tournament: Tournament): Promise<void> => {
      const tournaments = await db.getTournaments();
      const index = tournaments.findIndex(t => t.id === tournament.id);
      if (index > -1) {
          tournaments[index] = tournament;
      } else {
          tournaments.push(tournament);
      }
      saveData('tournaments', tournaments);
  },
  addTournament: async (data: Omit<Tournament, 'id' | 'pendingMemberIds'>): Promise<Tournament> => {
      const tournaments = await db.getTournaments();
      const newTournament: Tournament = {
          id: crypto.randomUUID(),
          ...data,
          pendingMemberIds: [],
      };
      tournaments.push(newTournament);
      saveData('tournaments', tournaments);
      return newTournament;
  },
  findTournamentByCode: async (code: string): Promise<Tournament | undefined> => {
      const tournaments = await db.getTournaments();
      return tournaments.find(t => t.inviteCode === code);
  },

  // Point Adjustments
  getPointAdjustments: async (): Promise<PointAdjustment[]> => {
      const adjustments = getData<PointAdjustment[]>('pointAdjustments', []);
      return adjustments.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  addPointAdjustment: async (data: Omit<PointAdjustment, 'id' | 'timestamp'>): Promise<PointAdjustment> => {
      const adjustments = await db.getPointAdjustments();
      const newAdjustment: PointAdjustment = {
          id: crypto.randomUUID(),
          ...data,
          timestamp: new Date().toISOString()
      };
      adjustments.push(newAdjustment);
      saveData('pointAdjustments', adjustments);
      
      const notifications = getData<Notification[]>('notifications', []);
      const notification: PointsAdjustmentNotification = {
          id: crypto.randomUUID(),
          toUserId: data.userId, type: 'points_adjustment', points: data.points,
          reason: data.reason, adminId: data.adminId, timestamp: new Date().toISOString(), seen: false
      };
      notifications.push(notification);
      saveData('notifications', notifications);
      
      return newAdjustment;
  },

  // Notifications
  getExistingUnseenPoke: async (fromUserId: string, toUserId: string): Promise<PokeNotification | undefined> => {
      const notifications = await db.getNotificationsForUser(toUserId);
      return notifications.find(n => 
          n.type === 'poke' && 
          (n as PokeNotification).fromUserId === fromUserId
      ) as PokeNotification | undefined;
  },
  addPoke: async (fromUserId: string, toUserId: string): Promise<Notification> => {
      const notifications = getData<Notification[]>('notifications', []);
      const newPoke: PokeNotification = {
          id: crypto.randomUUID(),
          type: 'poke', fromUserId, toUserId, timestamp: new Date().toISOString(), seen: false,
      };
      notifications.push(newPoke);
      saveData('notifications', notifications);
      return newPoke;
  },
  sendTournamentInvite: async (fromUserId: string, toUserId: string, tournamentId: string, tournamentName: string): Promise<Notification | null> => {
      const tournaments = await db.getTournaments();
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (!tournament) return null;

      if (tournament.memberIds.includes(toUserId) || tournament.pendingMemberIds.includes(toUserId)) {
          return null;
      }
      
      tournament.pendingMemberIds.push(toUserId);
      await db.saveTournament(tournament);

      const notifications = getData<Notification[]>('notifications', []);
      const newInvite: TournamentInviteNotification = {
          id: crypto.randomUUID(),
          type: 'tournament_invite', fromUserId, toUserId, tournamentId, tournamentName,
          timestamp: new Date().toISOString(), seen: false,
      };
      notifications.push(newInvite);
      saveData('notifications', notifications);
      return newInvite;
  },
  acceptTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<Tournament | null> => {
      const tournaments = await db.getTournaments();
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (!tournament) return null;
      
      tournament.pendingMemberIds = tournament.pendingMemberIds.filter(id => id !== userId);
      if (!tournament.memberIds.includes(userId)) {
          tournament.memberIds.push(userId);
      }
      await db.saveTournament(tournament);

      const notifications = getData<Notification[]>('notifications', []);
      const inviteNotifIndex = notifications.findIndex(n => n.id === notificationId);
      if (inviteNotifIndex > -1) {
          notifications[inviteNotifIndex].seen = true;
      }

      const acceptanceNotification: TournamentInviteAcceptedNotification = {
          id: crypto.randomUUID(),
          type: 'tournament_invite_accepted', toUserId: tournament.creatorId, fromUserId: userId,
          tournamentId: tournament.id, tournamentName: tournament.name, timestamp: new Date().toISOString(), seen: false,
      };
      notifications.push(acceptanceNotification);
      saveData('notifications', notifications);
      
      return tournament;
  },
  declineTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<void> => {
      const tournaments = await db.getTournaments();
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (!tournament) return;

      tournament.pendingMemberIds = tournament.pendingMemberIds.filter(id => id !== userId);
      await db.saveTournament(tournament);
      
      const notifications = getData<Notification[]>('notifications', []);
      const inviteNotifIndex = notifications.findIndex(n => n.id === notificationId);
      if (inviteNotifIndex > -1) {
          notifications[inviteNotifIndex].seen = true;
      }
      
      const declineNotification: TournamentInviteDeclinedNotification = {
          id: crypto.randomUUID(),
          type: 'tournament_invite_declined', toUserId: tournament.creatorId, fromUserId: userId,
          tournamentId, tournamentName: tournament.name, timestamp: new Date().toISOString(), seen: false,
      };
      notifications.push(declineNotification);
      saveData('notifications', notifications);
  },
  getNotificationsForUser: async (toUserId: string): Promise<Notification[]> => {
      const allNotifications = getData<Notification[]>('notifications', []);
      return allNotifications
          .filter(n => n.toUserId === toUserId && !n.seen)
          .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  markNotificationsAsSeen: async (notificationIds: string[]): Promise<void> => {
      const notifications = getData<Notification[]>('notifications', []);
      notifications.forEach(n => {
          if (notificationIds.includes(n.id)) {
              n.seen = true;
          }
      });
      saveData('notifications', notifications);
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
      const [allUsers, allOfficialResults, allPredictions, allAdjustments] = await Promise.all([
          db.getUsers(),
          db.getOfficialResults(),
          getData<Prediction[]>('predictions', []),
          db.getPointAdjustments()
      ]);
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
    localStorage.removeItem('seeded');
    seedDatabase();
  }
};