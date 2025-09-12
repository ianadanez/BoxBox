

export interface User {
  id: string;
  username: string;
  email: string; // Used as a unique identifier for login
  password?: string; // Stored plaintext for local demo. DO NOT USE IN PRODUCTION.
  role: 'user' | 'admin';
  avatar: Avatar;
  favoriteTeamId?: string;
  createdAt: string;
}

export interface Avatar {
  color: string;
  secondaryColor: string;
  skinColor: string;
  eyes: 'normal' | 'wink' | 'laser' | 'chequered' | 'drs' | 'pitstop' | 'determined' | 'star' | 'goggles';
  pattern: 'none' | 'stripes' | 'halftone' | 'checkers' | 'flames' | 'carbon';
}

export interface Team {
  id: string;
  name:string;
  color: string;
}

export interface Driver {
  id: string;
  name: string;
  teamId: string;
  isActive: boolean;
}

export interface GrandPrix {
  id: number;
  name: string;
  country: string;
  track: string;
  hasSprint: boolean;
  events: {
    quali: string; // ISO date string
    sprint?: string; // ISO date string
    race: string; // ISO date string
  };
}

export interface Prediction {
  userId: string;
  gpId: number;
  pole?: string; // driverId
  sprintPole?: string; // driverId
  sprintPodium?: [string, string, string]; // [p1, p2, p3] driverIds
  racePodium?: [string, string, string]; // [p1, p2, p3] driverIds
  fastestLap?: string; // driverId
  driverOfTheDay?: string; // driverId
  submittedAt: string; // ISO date string for tie-breakers
}

export interface Result {
  gpId: number;
  pole?: string; // driverId
  sprintPole?: string; // driverId
  sprintPodium?: [string, string, string];
  racePodium?: [string, string, string];
  fastestLap?: string; // driverId
  driverOfTheDay?: string; // driverId
}

export interface OfficialResult extends Result {
  publishedAt: string;
  manualOverrides: { [key in keyof Omit<Result, 'gpId'>]?: { user: string, reason: string } };
}

export interface Tournament {
  id: string;
  name: string;
  inviteCode: string;
  creatorId: string;
  memberIds: string[];
  pendingMemberIds: string[];
}

export interface PointAdjustment {
  id: string;
  userId: string;
  points: number;
  reason: string;
  adminId: string;
  timestamp: string; // ISO date string
}

// Unified Notification System
interface BaseNotification {
  id: string;
  toUserId: string;
  timestamp: string; // ISO date string
  seen: boolean;
}

export interface PokeNotification extends BaseNotification {
  type: 'poke';
  fromUserId: string;
}

export interface ResultsNotification extends BaseNotification {
    type: 'results';
    gpId: number;
    gpName: string;
}

export interface PointsAdjustmentNotification extends BaseNotification {
    type: 'points_adjustment';
    points: number;
    reason: string;
    adminId: string;
}

export interface TournamentInviteNotification extends BaseNotification {
    type: 'tournament_invite';
    fromUserId: string;
    tournamentId: string;
    tournamentName: string;
}

export interface TournamentInviteAcceptedNotification extends BaseNotification {
    type: 'tournament_invite_accepted';
    fromUserId: string; // The user who accepted
    tournamentId: string;
    tournamentName: string;
}

export interface TournamentInviteDeclinedNotification extends BaseNotification {
    type: 'tournament_invite_declined';
    fromUserId: string; // The user who declined
    tournamentId: string;
    tournamentName: string;
}

export type Notification = PokeNotification | ResultsNotification | PointsAdjustmentNotification | TournamentInviteNotification | TournamentInviteAcceptedNotification | TournamentInviteDeclinedNotification;


export interface Score {
  userId: string;
  gpId: number;
  totalPoints: number;
  breakdown: {
    pole: number;
    sprintPole: number;
    sprintPodium: number;
    racePodium: number;
    fastestLap: number;
    driverOfTheDay: number;
  }
}

export interface GpScore {
  gpId: number;
  totalPoints: number;
  breakdown: {
    pole: number;
    sprintPole: number;
    sprintPodium: number;
    racePodium: number;
    fastestLap: number;
    driverOfTheDay: number;
  };
}


export type ScoreDetail = {
  exactPole: number;
  exactP1: number;
  exactFastestLap: number;
}
export interface UserScore extends Score {
    userUsername: string;
    userAvatar: Avatar;
    details: ScoreDetail;
}

export interface SeasonTotal {
    userId: string;
    userUsername: string;
    userAvatar: Avatar;
    totalPoints: number;
    details: ScoreDetail;
    pointAdjustments?: PointAdjustment[];
}