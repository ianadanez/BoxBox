

import { User, Team, Driver, GrandPrix, Prediction, OfficialResult, Result, Tournament, Score, SeasonTotal, PointAdjustment, Notification, PokeNotification, TournamentInviteNotification } from '../types';
import { TEAMS, DRIVERS, GP_SCHEDULE, SCORING_RULES } from '../constants';

// In-memory data stores
let users: User[] = [];
let teams: Team[] = [];
let drivers: Driver[] = [];
let schedule: GrandPrix[] = [];
let predictions: Prediction[] = [];
let draftResults: Result[] = [];
let officialResults: OfficialResult[] = [];
let tournaments: Tournament[] = [];
let pointAdjustments: PointAdjustment[] = [];
let notifications: Notification[] = [];

// Helper to generate random avatars
const getRandomAvatar = (): User['avatar'] => ({
    skinColor: '#C68642',
    color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
    secondaryColor: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
    eyes: ['normal', 'wink', 'laser', 'chequered', 'drs', 'pitstop', 'determined', 'star', 'goggles'][Math.floor(Math.random() * 9)] as User['avatar']['eyes'],
    pattern: ['none', 'stripes', 'halftone', 'checkers', 'flames', 'carbon'][Math.floor(Math.random() * 6)] as User['avatar']['pattern'],
});

const initDb = () => {
    // Reset arrays
    users = [];
    teams = [];
    drivers = [];
    schedule = [];
    predictions = [];
    draftResults = [];
    officialResults = [];
    tournaments = [];
    pointAdjustments = [];
    notifications = [];
    
    // Seed Users
    const adminUser: User = { id: 'admin-id', name: 'Admin', email: 'admin@boxbox.com', role: 'admin', avatar: getRandomAvatar(), createdAt: new Date().toISOString() };
    users.push(adminUser);

    const fanNames = ["Max Fan", "Charles Fan", "Lando Fan", "Lewis Fan", "George Fan", "Oscar Fan", "Fernando Fan", "Carlos Fan", "Checo Fan", "Kimi Fan"];
    for (let i = 1; i <= 11; i++) {
        users.push({
            id: `user${i}-id`,
            name: fanNames[i-1] || `User ${i}`,
            email: `user${i}@boxbox.com`,
            role: 'user',
            avatar: getRandomAvatar(),
            createdAt: new Date().toISOString()
        });
    }

    // Seed Catalogues from constants
    teams = [...TEAMS];
    drivers = [...DRIVERS];
    schedule = [...GP_SCHEDULE];
};

// Initialize DB on module load
initDb();

export const db = {
  // Users
  getUsers: async (): Promise<User[]> => Promise.resolve([...users]),
  getUserByEmail: async (email: string): Promise<User | undefined> => Promise.resolve(users.find(u => u.email === email)),
  getUserById: async (id: string): Promise<User | undefined> => Promise.resolve(users.find(u => u.id === id)),
  saveUser: async (user: User): Promise<void> => {
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) {
        users[index] = user;
    } else {
        users.push(user);
    }
    return Promise.resolve();
  },

  // Catalogue
  getTeams: async (): Promise<Team[]> => Promise.resolve([...teams]),
  getDrivers: async (activeOnly = false): Promise<Driver[]> => {
    if (activeOnly) return Promise.resolve(drivers.filter(d => d.isActive));
    return Promise.resolve([...drivers]);
  },
  saveDriver: async (driver: Driver): Promise<void> => {
    const index = drivers.findIndex(d => d.id === driver.id);
    if (index > -1) drivers[index] = driver;
    else drivers.push(driver);
    return Promise.resolve();
  },
  getSchedule: async (): Promise<GrandPrix[]> => Promise.resolve([...schedule].sort((a,b) => new Date(a.events.race).getTime() - new Date(b.events.race).getTime())),
  saveGp: async (gp: GrandPrix): Promise<void> => {
    const index = schedule.findIndex(g => g.id === gp.id);
    if(index > -1) schedule[index] = gp;
    else schedule.push(gp);
    return Promise.resolve();
  },
  replaceSchedule: async (newSchedule: GrandPrix[]): Promise<void> => {
      schedule = newSchedule;
      return Promise.resolve();
  },

  // Predictions
  getPrediction: async (userId: string, gpId: number): Promise<Prediction | undefined> => {
    return Promise.resolve(predictions.find(p => p.userId === userId && p.gpId === gpId));
  },
  savePrediction: async (prediction: Prediction): Promise<void> => {
    const index = predictions.findIndex(p => p.userId === prediction.userId && p.gpId === prediction.gpId);
    const predToSave = { ...prediction, submittedAt: new Date().toISOString() };
    if (index > -1) {
        predictions[index] = predToSave;
    } else {
        predictions.push(predToSave);
    }
    return Promise.resolve();
  },
  
  // Results
  getDraftResult: async (gpId: number): Promise<Result | undefined> => {
    return Promise.resolve(draftResults.find(r => r.gpId === gpId));
  },
  saveDraftResult: async (result: Result): Promise<void> => {
      const index = draftResults.findIndex(r => r.gpId === result.gpId);
      if(index > -1) draftResults[index] = result;
      else draftResults.push(result);
      return Promise.resolve();
  },
  getOfficialResult: async (gpId: number): Promise<OfficialResult | undefined> => {
      return Promise.resolve(officialResults.find(r => r.gpId === gpId));
  },
  getOfficialResults: async (): Promise<OfficialResult[]> => {
      return Promise.resolve([...officialResults]);
  },
  publishResult: async (result: OfficialResult): Promise<void> => {
     const resultToSave = { ...result, publishedAt: new Date().toISOString() };
     const index = officialResults.findIndex(r => r.gpId === result.gpId);
     if(index > -1) officialResults[index] = resultToSave;
     else officialResults.push(resultToSave);
     
     // Create notifications for users who predicted
     const gp = schedule.find(g => g.id === result.gpId);
     const usersWhoPredicted = [...new Set(predictions.filter(p => p.gpId === result.gpId).map(p => p.userId))];
     usersWhoPredicted.forEach(userId => {
         const notification: Notification = {
             id: `notif_${Date.now()}_${userId}`,
             toUserId: userId,
             type: 'results',
             gpId: result.gpId,
             gpName: gp?.name || 'una carrera',
             timestamp: new Date().toISOString(),
             seen: false
         };
         notifications.push(notification);
     });
     
     // remove draft
     draftResults = draftResults.filter(r => r.gpId !== result.gpId);
     return Promise.resolve();
  },

  // Tournaments
  getTournaments: async (): Promise<Tournament[]> => Promise.resolve([...tournaments]),
  saveTournament: async (tournament: Tournament): Promise<void> => {
      const index = tournaments.findIndex(t => t.id === tournament.id);
      if(index > -1) tournaments[index] = tournament;
      return Promise.resolve();
  },
  addTournament: async (data: Omit<Tournament, 'id' | 'pendingMemberIds'>): Promise<Tournament> => {
      const newTournament = { ...data, id: `tour_${Date.now()}`, pendingMemberIds: [] };
      tournaments.push(newTournament);
      return Promise.resolve(newTournament);
  },
  findTournamentByCode: async (code: string): Promise<Tournament | undefined> => {
      return Promise.resolve(tournaments.find(t => t.inviteCode === code));
  },

  // Point Adjustments
  getPointAdjustments: async (): Promise<PointAdjustment[]> => {
    return Promise.resolve([...pointAdjustments].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  },
  addPointAdjustment: async (data: Omit<PointAdjustment, 'id' | 'timestamp'>): Promise<PointAdjustment> => {
      const newAdjustment = { ...data, id: `adj_${Date.now()}`, timestamp: new Date().toISOString() };
      pointAdjustments.push(newAdjustment);
      
      // Create notification for the user
      const notification: Notification = {
          id: `notif_${Date.now()}`,
          toUserId: data.userId,
          type: 'points_adjustment',
          points: data.points,
          reason: data.reason,
          adminId: data.adminId,
          timestamp: new Date().toISOString(),
          seen: false
      };
      notifications.push(notification);
      
      return Promise.resolve(newAdjustment);
  },

  // Notifications (replaces Pokes)
  getExistingUnseenPoke: async (fromUserId: string, toUserId: string): Promise<PokeNotification | undefined> => {
    return Promise.resolve(
        notifications.find(n => n.type === 'poke' && n.fromUserId === fromUserId && n.toUserId === toUserId && !n.seen) as PokeNotification | undefined
    );
  },
  addPoke: async (fromUserId: string, toUserId: string): Promise<Notification> => {
    const newPoke: PokeNotification = {
      id: `poke_${Date.now()}`,
      type: 'poke',
      fromUserId,
      toUserId,
      timestamp: new Date().toISOString(),
      seen: false,
    };
    notifications.push(newPoke);
    return Promise.resolve(newPoke);
  },
  sendTournamentInvite: async (fromUserId: string, toUserId: string, tournamentId: string, tournamentName: string): Promise<Notification | null> => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) {
        console.error("Tournament not found for invite");
        return null;
    }
    
    // Check if already member or invite is pending
    if (tournament.memberIds.includes(toUserId) || tournament.pendingMemberIds.includes(toUserId)) {
        console.log("User is already a member or has a pending invitation.");
        return null;
    }
    
    // Add to pending
    tournament.pendingMemberIds.push(toUserId);

    const newInvite: TournamentInviteNotification = {
      id: `tourn_invite_${Date.now()}`,
      type: 'tournament_invite',
      fromUserId,
      toUserId,
      tournamentId,
      tournamentName,
      timestamp: new Date().toISOString(),
      seen: false,
    };
    notifications.push(newInvite);
    return Promise.resolve(newInvite);
  },
  acceptTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<Tournament | null> => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (tournament) {
      // Move from pending to members
      tournament.pendingMemberIds = tournament.pendingMemberIds.filter(id => id !== userId);
      if (!tournament.memberIds.includes(userId)) {
        tournament.memberIds.push(userId);
      }
      
      // Mark original invite as seen
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.seen = true;
      }

      // Notify creator of acceptance
      const acceptanceNotification: Notification = {
          id: `tourn_accept_${Date.now()}`,
          type: 'tournament_invite_accepted',
          toUserId: tournament.creatorId,
          fromUserId: userId,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          timestamp: new Date().toISOString(),
          seen: false,
      };
      notifications.push(acceptanceNotification);

      return Promise.resolve(tournament);
    }
    return Promise.resolve(null);
  },
  declineTournamentInvite: async (notificationId: string, userId: string, tournamentId: string): Promise<void> => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (tournament) {
        // Remove from pending
        tournament.pendingMemberIds = tournament.pendingMemberIds.filter(id => id !== userId);
        
        // Notify creator of decline
        const declineNotification: Notification = {
          id: `tourn_decline_${Date.now()}`,
          type: 'tournament_invite_declined',
          toUserId: tournament.creatorId,
          fromUserId: userId,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          timestamp: new Date().toISOString(),
          seen: false,
        };
        notifications.push(declineNotification);
    }

    // Mark original invite as seen
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.seen = true;
    }
    return Promise.resolve();
  },
  getNotificationsForUser: async (toUserId: string): Promise<Notification[]> => {
    return Promise.resolve(
        notifications.filter(n => n.toUserId === toUserId && !n.seen)
             .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    );
  },
  markNotificationsAsSeen: async (notificationIds: string[]): Promise<void> => {
    notifications.forEach(notification => {
        if(notificationIds.includes(notification.id)) {
            notification.seen = true;
        }
    });
    return Promise.resolve();
  },
  
  // Scoring Logic (remains mostly the same, just uses local data)
  calculateGpScores: (gpId: number, officialResult: OfficialResult, allPredictions: Prediction[]): Score[] => {
    if (!officialResult) return [];
    const gpPredictions = allPredictions.filter(p => p.gpId === gpId);
    const scores: Score[] = [];
    gpPredictions.forEach(p => {
        const score: Score = {
            userId: p.userId,
            gpId: gpId,
            totalPoints: 0,
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
          Promise.resolve(predictions),
          db.getPointAdjustments()
      ]);
      const totals: Map<string, SeasonTotal> = new Map();
      allUsers.forEach(user => {
          totals.set(user.id, {
              userId: user.id, userName: user.name, userAvatar: user.avatar,
              totalPoints: 0,
              details: { exactP1: 0, exactPole: 0, exactFastestLap: 0 },
              pointAdjustments: []
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
      const sortedTotals = Array.from(totals.values()).sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          if (b.details.exactP1 !== a.details.exactP1) return b.details.exactP1 - a.details.exactP1;
          if (b.details.exactPole !== a.details.exactPole) return b.details.exactPole - a.details.exactPole;
          if (b.details.exactFastestLap !== a.details.exactFastestLap) return b.details.exactFastestLap - a.details.exactFastestLap;
          return a.userName.localeCompare(b.userName);
      });
      return Promise.resolve(sortedTotals);
  },
  
  // For seeding from Admin Panel
  seedDatabase: async (): Promise<void> => {
    initDb();
    return Promise.resolve();
  }
};