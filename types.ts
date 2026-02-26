
export interface Season {
  id: string; // e.g., "2025", "2026"
  name: string; // e.g., "Formula 1 Season 2025"
  status: 'active' | 'inactive';
  startDate?: string; // ISO date string e.g., "2025-03-14"
  endDate?: string; // ISO date string e.g., "2025-12-07"
  year?: number;
}

export interface SeasonImportPayload {
  schedule: GrandPrix[];
  teams: Team[];
  drivers: Driver[];
}

export interface SeasonImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fieldErrors: Record<string, string[]>;
}

export interface SeasonImportCollectionDiff {
  currentCount: number;
  incomingCount: number;
  toCreate: number;
  toUpdate: number;
  toDelete: number;
  unchanged: number;
}

export interface SeasonImportDryRun {
  seasonId: string;
  generatedAt: string;
  validation: SeasonImportValidationResult;
  collections: {
    schedule: SeasonImportCollectionDiff;
    teams: SeasonImportCollectionDiff;
    drivers: SeasonImportCollectionDiff;
  };
}

export interface SeasonImportVersion {
  id: string;
  seasonId: string;
  createdAt?: any;
  createdBy?: string;
  source?: string;
  note?: string;
  snapshotStats: {
    scheduleCount: number;
    teamsCount: number;
    driversCount: number;
  };
}

export interface User {
  id: string;
  username: string;
  email: string; // Used as a unique identifier for login
  // Password removed for security. Auth is handled by Firebase Auth.
  role: 'user' | 'admin';
  avatar: Avatar;
  favoriteTeamId?: string;
  favoriteTeamSeason?: string; // temporada en la que se confirmó el favorito
  favoriteTeamHistory?: FavoriteTeamAssignment[];
  countryCode?: string;
  createdAt: string;
}

export interface FavoriteTeamAssignment {
  teamId: string;
  from: string; // ISO date string
}

export interface ReminderTemplate {
  id?: string;
  title: string;
  body: string;
  enabled?: boolean;
  weight?: number;
}

export interface NotificationSettings {
  pushMirrorEnabled: boolean;
  predictionReminderEnabled: boolean;
  predictionReminderSessions: Array<'quali' | 'sprint_qualy'>;
  predictionReminderCount: number;
  predictionReminderWindowHours: number;
  predictionReminderFinalOffsetMinutes?: number;
  predictionReminderTemplates: ReminderTemplate[];
  // Legacy fields kept for backward compatibility with old docs.
  predictionReminderOffsets?: number[];
  predictionReminderTitle?: string;
  predictionReminderBody?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface ScheduledNotification {
  id?: string;
  title: string;
  body: string;
  scheduledAt: any; // Firestore Timestamp
  status?: 'pending' | 'sending' | 'sent' | 'error' | 'cancelled';
  audience?: { type: 'all' | 'uids'; uids?: string[] };
  data?: Record<string, unknown>;
  createdAt?: any;
  createdBy?: string;
  error?: string;
  sendCount?: number;
  pushReceiptStatus?: 'none' | 'pending' | 'delivered' | 'partial' | 'error';
  pushReceiptOkCount?: number;
  pushReceiptErrorCount?: number;
  pushReceiptPendingCount?: number;
  pushOpenedCount?: number;
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
    sprintQuali?: string; // ISO date string
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
  publishedSessions: ('quali' | 'sprint' | 'race')[];
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
    session: 'quali' | 'sprint' | 'race';
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
  gpName: string;
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

export type PublicStanding = {
    userId?: string;
    userUsername: string;
    userAvatar: Avatar;
    totalPoints: number;
    details?: Partial<ScoreDetail>;
};

export interface ConstructorStanding {
    teamId: string;
    teamName: string;
    teamColor: string;
    totalPoints: number;
    supporters: number;
    sourceUserPoints: number;
}

export type PublicConstructorStanding = ConstructorStanding;

// Season Wrapped
export interface SeasonWrappedData {
    totalPoints: { label: string; value: number; description: string; };
    bestGp: { label: string; value: { gpName: string; points: number }; };
    favoriteDriver: { label: string; value: string; description: string; };
    nemesisDriver: { label: string; value: string; description: string; };
    polePositionHits: { label: string; value: number; description: string; };
    podiumHits: { label: string; value: number; description: string; };
}
