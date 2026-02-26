
import {
  User,
  Team,
  Driver,
  GrandPrix,
  Prediction,
  OfficialResult,
  Result,
  Tournament,
  GpScore,
  SeasonTotal,
  PointAdjustment,
  Notification,
  ResultsNotification,
  TournamentInviteNotification,
  TournamentInviteAcceptedNotification,
  TournamentInviteDeclinedNotification,
  PokeNotification,
  PointsAdjustmentNotification,
  Season,
  PublicStanding,
  PublicConstructorStanding,
  ConstructorStanding,
  NotificationSettings,
  ScheduledNotification,
  SeasonImportPayload,
  SeasonImportValidationResult,
  SeasonImportDryRun,
  SeasonImportCollectionDiff,
  SeasonImportVersion,
} from '../types';
import { TEAMS, DRIVERS, GP_SCHEDULE } from '../constants';
import { engine } from './engine';
// Import the season service functions
import { getActiveSeason, clearActiveSeasonCache, getLastInactiveSeasonId } from './seasonService';

// FIX: Added firebase compat import for FieldValue operations.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
// FIX: Corrected the import to match the export from firebaseConfig.ts
import { firestore } from '../firebaseConfig';

// Environment guard for client-only operations
const env = (import.meta as any)?.env || {};
const isDev = !!env.DEV;
const allowClientSeed = env.VITE_ALLOW_CLIENT_SEED === 'true';

// --- Top-Level Collection References ---
const usersCol = firestore.collection('users');
const usernamesCol = firestore.collection('usernames');
const notificationsCol = firestore.collection('notifications');
const settingsCol = firestore.collection('settings');
const scheduledNotificationsCol = firestore.collection('scheduled_notifications');
const seasonsCol = firestore.collection('seasons'); // New collection ref
const publicLeaderboardCol = (seasonId: string) => firestore.collection(`seasons/${seasonId}/public_leaderboard`);
const publicConstructorsLeaderboardCol = (seasonId: string) => firestore.collection(`seasons/${seasonId}/public_constructors_leaderboard`);
const publicGpStandingsCol = (seasonId: string, gpId: number) => firestore.collection(`seasons/${seasonId}/public_gp_standings/${gpId}/standings`);
const seasonImportVersionsCol = (seasonId: string) => firestore.collection(`seasons/${seasonId}/import_versions`);


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

/**
 * Explicit season collection reference (no dependency on active season).
 */
const getSeasonCollectionById = (seasonId: string, collectionName: 'schedule' | 'predictions' | 'results' | 'tournaments' | 'pointAdjustments' | 'draft_results' | 'teams' | 'drivers') => {
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

const normalizeUsername = (username: string): string => username.trim().toLowerCase();
const notificationSettingsRef = settingsCol.doc('notifications');

const stripUndefinedDeep = (value: any): any => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    if (proto === Object.prototype || proto === null) {
      const out: Record<string, any> = {};
      Object.entries(value).forEach(([key, nested]) => {
        const cleaned = stripUndefinedDeep(nested);
        if (cleaned !== undefined) out[key] = cleaned;
      });
      return out;
    }
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseIsoDate = (value: unknown): number | null => {
  if (!isNonEmptyString(value)) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

const sortObjectKeysDeep = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeysDeep);
  }
  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        acc[key] = sortObjectKeysDeep((value as Record<string, any>)[key]);
        return acc;
      }, {});
  }
  return value;
};

const stableSerialize = (value: any): string =>
  JSON.stringify(sortObjectKeysDeep(stripUndefinedDeep(value)));

const createImportValidationAccumulator = () => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldErrors: Record<string, string[]> = {};

  const addError = (field: string, message: string) => {
    errors.push(message);
    if (!fieldErrors[field]) fieldErrors[field] = [];
    fieldErrors[field].push(message);
  };

  const addWarning = (message: string) => {
    warnings.push(message);
  };

  return { errors, warnings, fieldErrors, addError, addWarning };
};

const validateSeasonImportPayload = (payload: unknown): SeasonImportValidationResult => {
  const { errors, warnings, fieldErrors, addError, addWarning } = createImportValidationAccumulator();

  if (!isRecord(payload)) {
    addError("payload", "El JSON de temporada debe ser un objeto.");
    return { isValid: false, errors, warnings, fieldErrors };
  }

  const schedule = payload.schedule;
  const teams = payload.teams;
  const drivers = payload.drivers;

  if (!Array.isArray(schedule)) addError("schedule", "El campo schedule debe ser un array.");
  if (!Array.isArray(teams)) addError("teams", "El campo teams debe ser un array.");
  if (!Array.isArray(drivers)) addError("drivers", "El campo drivers debe ser un array.");
  if (!Array.isArray(schedule) || !Array.isArray(teams) || !Array.isArray(drivers)) {
    return { isValid: false, errors, warnings, fieldErrors };
  }

  if (schedule.length === 0) addError("schedule", "schedule no puede estar vacio.");
  if (teams.length === 0) addError("teams", "teams no puede estar vacio.");
  if (drivers.length === 0) addError("drivers", "drivers no puede estar vacio.");

  const gpIds = new Set<number>();
  schedule.forEach((gp, index) => {
    const path = `schedule[${index}]`;
    if (!isRecord(gp)) {
      addError(path, "Cada GP debe ser un objeto.");
      return;
    }
    const gpId = gp.id;
    if (!Number.isInteger(gpId) || Number(gpId) <= 0) {
      addError(`${path}.id`, "id debe ser un numero entero positivo.");
    } else {
      if (gpIds.has(Number(gpId))) addError(`${path}.id`, `id duplicado: ${gpId}.`);
      gpIds.add(Number(gpId));
    }
    if (!isNonEmptyString(gp.name)) addError(`${path}.name`, "name es obligatorio.");
    if (!isNonEmptyString(gp.country)) addError(`${path}.country`, "country es obligatorio.");
    if (!isNonEmptyString(gp.track)) addError(`${path}.track`, "track es obligatorio.");
    if (typeof gp.hasSprint !== "boolean") {
      addError(`${path}.hasSprint`, "hasSprint debe ser boolean.");
    }
    if (!isRecord(gp.events)) {
      addError(`${path}.events`, "events debe ser un objeto.");
      return;
    }

    const qualiMs = parseIsoDate(gp.events.quali);
    const raceMs = parseIsoDate(gp.events.race);
    if (qualiMs === null) addError(`${path}.events.quali`, "events.quali debe ser fecha ISO valida.");
    if (raceMs === null) addError(`${path}.events.race`, "events.race debe ser fecha ISO valida.");
    if (qualiMs !== null && raceMs !== null && qualiMs >= raceMs) {
      addError(`${path}.events`, "La clasificacion debe ocurrir antes de la carrera.");
    }

    const hasSprint = gp.hasSprint === true;
    const sprintQualiMs = parseIsoDate(gp.events.sprintQuali);
    const sprintMs = parseIsoDate(gp.events.sprint);
    if (hasSprint) {
      if (sprintQualiMs === null) {
        addError(`${path}.events.sprintQuali`, "Sprint Quali obligatoria cuando hasSprint=true.");
      }
      if (sprintMs === null) {
        addError(`${path}.events.sprint`, "Sprint obligatorio cuando hasSprint=true.");
      }
    }
    if (sprintQualiMs !== null && qualiMs !== null && sprintQualiMs > qualiMs) {
      addWarning(`GP ${gpId || index + 1}: sprintQuali ocurre despues de quali.`);
    }
    if (sprintMs !== null && raceMs !== null && sprintMs > raceMs) {
      addError(`${path}.events.sprint`, "Sprint no puede ser despues de la carrera.");
    }
  });

  const teamIds = new Set<string>();
  teams.forEach((team, index) => {
    const path = `teams[${index}]`;
    if (!isRecord(team)) {
      addError(path, "Cada equipo debe ser un objeto.");
      return;
    }
    const teamId = team.id;
    if (!isNonEmptyString(teamId)) {
      addError(`${path}.id`, "id es obligatorio.");
      return;
    }
    if (teamIds.has(teamId)) addError(`${path}.id`, `id duplicado: ${teamId}.`);
    teamIds.add(teamId);
    if (!isNonEmptyString(team.name)) addError(`${path}.name`, "name es obligatorio.");
    if (!isNonEmptyString(team.color)) addError(`${path}.color`, "color es obligatorio.");
  });

  const driverIds = new Set<string>();
  const teamUsage = new Map<string, number>();
  drivers.forEach((driver, index) => {
    const path = `drivers[${index}]`;
    if (!isRecord(driver)) {
      addError(path, "Cada piloto debe ser un objeto.");
      return;
    }
    const driverId = driver.id;
    if (!isNonEmptyString(driverId)) {
      addError(`${path}.id`, "id es obligatorio.");
      return;
    }
    if (driverIds.has(driverId)) addError(`${path}.id`, `id duplicado: ${driverId}.`);
    driverIds.add(driverId);
    if (!isNonEmptyString(driver.name)) addError(`${path}.name`, "name es obligatorio.");
    if (!isNonEmptyString(driver.teamId)) {
      addError(`${path}.teamId`, "teamId es obligatorio.");
    } else if (!teamIds.has(driver.teamId)) {
      addError(`${path}.teamId`, `teamId '${driver.teamId}' no existe en teams.`);
    } else {
      teamUsage.set(driver.teamId, (teamUsage.get(driver.teamId) || 0) + 1);
    }
    if (typeof driver.isActive !== "boolean") {
      addError(`${path}.isActive`, "isActive debe ser boolean.");
    }
  });

  teams.forEach((team, index) => {
    if (!isRecord(team) || !isNonEmptyString(team.id)) return;
    if (!teamUsage.get(team.id)) {
      addWarning(`teams[${index}] (${team.id}) no tiene pilotos asociados en drivers.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fieldErrors,
  };
};

const computeCollectionDiff = <T extends Record<string, any>>(
  currentDocs: firebase.firestore.QueryDocumentSnapshot[],
  incomingDocs: T[],
  getId: (item: T) => string
): SeasonImportCollectionDiff => {
  const currentMap = new Map<string, any>();
  currentDocs.forEach((doc) => {
    currentMap.set(doc.id, stripUndefinedDeep(doc.data()));
  });

  const incomingMap = new Map<string, any>();
  incomingDocs.forEach((item) => {
    incomingMap.set(getId(item), stripUndefinedDeep(item));
  });

  let toCreate = 0;
  let toUpdate = 0;
  let unchanged = 0;

  incomingMap.forEach((item, id) => {
    if (!currentMap.has(id)) {
      toCreate += 1;
      return;
    }
    if (stableSerialize(currentMap.get(id)) !== stableSerialize(item)) {
      toUpdate += 1;
      return;
    }
    unchanged += 1;
  });

  let toDelete = 0;
  currentMap.forEach((_item, id) => {
    if (!incomingMap.has(id)) toDelete += 1;
  });

  return {
    currentCount: currentMap.size,
    incomingCount: incomingMap.size,
    toCreate,
    toUpdate,
    toDelete,
    unchanged,
  };
};

const replaceCollectionData = async <T extends Record<string, any>>(
  col: firebase.firestore.CollectionReference,
  data: T[],
  getId: (item: T) => string,
  label: string
) => {
  const snap = await col.get();
  const batch = firestore.batch();
  snap.forEach((doc) => batch.delete(doc.ref));
  data.forEach((item) => {
    batch.set(col.doc(getId(item)), stripUndefinedDeep(item));
  });
  await batch.commit();
  console.log(`replaceCollectionData: ${label} -> ${data.length} documentos`);
};

const createSeasonImportSnapshot = async (
  seasonId: string,
  options?: {
    createdBy?: string;
    source?: string;
    note?: string;
    dryRun?: Omit<SeasonImportDryRun, "validation">;
  }
): Promise<string> => {
  const [scheduleSnap, teamsSnap, driversSnap] = await Promise.all([
    firestore.collection(`seasons/${seasonId}/schedule`).get(),
    firestore.collection(`seasons/${seasonId}/teams`).get(),
    firestore.collection(`seasons/${seasonId}/drivers`).get(),
  ]);

  const schedule = scheduleSnap.docs.map((doc) => doc.data() as GrandPrix);
  const teams = teamsSnap.docs.map((doc) => doc.data() as Team);
  const drivers = driversSnap.docs.map((doc) => doc.data() as Driver);

  const versionRef = seasonImportVersionsCol(seasonId).doc();
  await versionRef.set(
    stripUndefinedDeep({
      id: versionRef.id,
      seasonId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: options?.createdBy,
      source: options?.source || "manual",
      note: options?.note,
      dryRun: options?.dryRun,
      snapshotStats: {
        scheduleCount: schedule.length,
        teamsCount: teams.length,
        driversCount: drivers.length,
      },
      snapshot: {
        schedule,
        teams,
        drivers,
      },
    })
  );

  return versionRef.id;
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
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 10) {
          chunks.push(ids.slice(i, i + 10));
      }
      const snapshots = await Promise.all(
          chunks.map(chunk => usersCol.where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get())
      );
      return snapshots.flatMap(snapshot => snapshot.docs.map(doc => applyUsernameFallback(doc.data() as User)));
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
      await docRef.set(stripUndefinedDeep(user), { merge: true });
  },
  reserveUsername: async (username: string, uid: string): Promise<void> => {
      const normalized = normalizeUsername(username);
      const docRef = usernamesCol.doc(normalized);
      await firestore.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (snap.exists) {
              const existing = snap.data() as { uid?: string } | undefined;
              if (existing?.uid && existing.uid === uid) {
                  return;
              }
              const error = new Error('El nombre de usuario ya está en uso.');
              (error as any).name = 'auth/username-already-in-use';
              throw error;
          }
          tx.set(docRef, {
              uid,
              username: username.trim(),
              usernameLower: normalized,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
      });
  },
  releaseUsername: async (username: string, uid?: string): Promise<void> => {
      const normalized = normalizeUsername(username);
      const docRef = usernamesCol.doc(normalized);
      await firestore.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) return;
          if (uid) {
              const data = snap.data() as { uid?: string } | undefined;
              if (data?.uid && data.uid !== uid) return;
          }
          tx.delete(docRef);
      });
  },
  searchUsersByUsername: async (query: string, limit = 20): Promise<User[]> => {
      const normalized = normalizeUsername(query);
      if (!normalized) return [];
      const snapshot = await usernamesCol
          .orderBy('usernameLower')
          .startAt(normalized)
          .endAt(`${normalized}\uf8ff`)
          .limit(limit)
          .get();

      if (snapshot.empty) return [];

      const entries = snapshot.docs.map(doc => doc.data() as { uid?: string; username?: string });
      const ids = entries.map(entry => entry.uid).filter(Boolean) as string[];
      if (ids.length === 0) return [];

      const users = await db.getUsersByIds(ids);
      const userMap = new Map(users.map(user => [user.id, user]));

      return entries
          .map(entry => (entry.uid ? userMap.get(entry.uid) : undefined))
          .filter(Boolean) as User[];
  },
  getNotificationSettings: async (): Promise<NotificationSettings> => {
      const snap = await notificationSettingsRef.get();
      const data = snap.exists ? (snap.data() as NotificationSettings) : undefined;
      const legacyTitle = data?.predictionReminderTitle ?? '⏰ Recordatorio {sessionName}';
      const legacyBody =
          data?.predictionReminderBody ??
          'No olvides completar tu predicción para {gpName}. Faltan {hours}h.';
      const templates =
          Array.isArray((data as any)?.predictionReminderTemplates) &&
          (data as any).predictionReminderTemplates.length
              ? (data as any).predictionReminderTemplates
                    .map((item: any, index: number) => ({
                        id: typeof item?.id === "string" ? item.id : `tpl_${index + 1}`,
                        title: typeof item?.title === "string" ? item.title : legacyTitle,
                        body: typeof item?.body === "string" ? item.body : legacyBody,
                        enabled: item?.enabled !== false,
                        weight: Number.isFinite(item?.weight) ? Number(item.weight) : 1,
                    }))
              : [
                    {
                        id: "default",
                        title: legacyTitle,
                        body: legacyBody,
                        enabled: true,
                        weight: 1,
                    },
                ];
      const legacyOffsets = Array.isArray(data?.predictionReminderOffsets)
          ? data?.predictionReminderOffsets.filter(v => Number.isFinite(v) && v > 0)
          : [];
      return {
          pushMirrorEnabled: data?.pushMirrorEnabled ?? true,
          predictionReminderEnabled: data?.predictionReminderEnabled ?? false,
          predictionReminderSessions: data?.predictionReminderSessions ?? ['quali', 'sprint_qualy'],
          predictionReminderCount:
              Number.isFinite((data as any)?.predictionReminderCount) && Number((data as any)?.predictionReminderCount) > 0
                  ? Number((data as any).predictionReminderCount)
                  : legacyOffsets.length > 0
                      ? legacyOffsets.length
                      : 3,
          predictionReminderWindowHours:
              Number.isFinite((data as any)?.predictionReminderWindowHours) && Number((data as any)?.predictionReminderWindowHours) > 0
                  ? Number((data as any).predictionReminderWindowHours)
                  : legacyOffsets.length > 0
                      ? Math.max(...legacyOffsets)
                      : 24,
          predictionReminderFinalOffsetMinutes: 10,
          predictionReminderTemplates: templates,
          predictionReminderOffsets: legacyOffsets,
          predictionReminderTitle: legacyTitle,
          predictionReminderBody: legacyBody,
          updatedAt: data?.updatedAt,
          updatedBy: data?.updatedBy,
      };
  },
  saveNotificationSettings: async (settings: NotificationSettings, adminId: string): Promise<void> => {
      await notificationSettingsRef.set(
          {
              ...settings,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedBy: adminId,
          },
          { merge: true }
      );
  },
  createScheduledNotification: async (payload: {
      title: string;
      body: string;
      scheduledAt: Date;
      audience: { type: 'all' } | { type: 'uids'; uids: string[] };
      data?: Record<string, unknown>;
      createdBy?: string;
  }): Promise<void> => {
      await scheduledNotificationsCol.add({
          title: payload.title,
          body: payload.body,
          scheduledAt: firebase.firestore.Timestamp.fromDate(payload.scheduledAt),
          status: 'pending',
          audience: payload.audience,
          data: payload.data ?? {},
          createdBy: payload.createdBy ?? null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  },
  listScheduledNotifications: async (limitCount = 20): Promise<ScheduledNotification[]> => {
      const snap = await scheduledNotificationsCol
          .orderBy('scheduledAt', 'desc')
          .limit(limitCount)
          .get();
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as ScheduledNotification) }));
  },
  cancelScheduledNotification: async (id: string): Promise<void> => {
      await scheduledNotificationsCol.doc(id).update({
          status: 'cancelled',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  },

  // --- SEASON MANAGEMENT ---
    listSeasons: async (): Promise<Season[]> => {
        const snapshot = await seasonsCol.get();
        // sort by id (year)
        return snapshot.docs.map(doc => doc.data() as Season).sort((a, b) => parseInt(a.id) - parseInt(b.id));
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

  updateSeason: async (season: Season): Promise<void> => {
    const seasonRef = seasonsCol.doc(season.id);
    await seasonRef.set(season, { merge: true });
    },

  setOffSeason: async (): Promise<void> => {
    const batch = firestore.batch();
    const allSeasonsSnap = await seasonsCol.get();
    allSeasonsSnap.forEach(doc => {
        batch.update(doc.ref, { status: 'inactive' });
    });
    await batch.commit();
    clearActiveSeasonCache();
    console.log('All seasons have been set to inactive. The app is now in off-season mode.');
  },

  validateSeasonImportPayload: (payload: unknown): SeasonImportValidationResult => {
    return validateSeasonImportPayload(payload);
  },

  getSeasonImportDryRun: async (seasonId: string, payload: SeasonImportPayload): Promise<SeasonImportDryRun> => {
    const validation = validateSeasonImportPayload(payload);
    if (!validation.isValid) {
      const error: any = new Error("JSON de temporada invalido.");
      error.validation = validation;
      throw error;
    }

    const [scheduleSnap, teamsSnap, driversSnap] = await Promise.all([
      firestore.collection(`seasons/${seasonId}/schedule`).get(),
      firestore.collection(`seasons/${seasonId}/teams`).get(),
      firestore.collection(`seasons/${seasonId}/drivers`).get(),
    ]);

    return {
      seasonId,
      generatedAt: new Date().toISOString(),
      validation,
      collections: {
        schedule: computeCollectionDiff(scheduleSnap.docs, payload.schedule, (gp) => String(gp.id)),
        teams: computeCollectionDiff(teamsSnap.docs, payload.teams, (team) => team.id),
        drivers: computeCollectionDiff(driversSnap.docs, payload.drivers, (driver) => driver.id),
      },
    };
  },

  listSeasonImportVersions: async (seasonId: string, limitCount = 10): Promise<SeasonImportVersion[]> => {
    const snapshot = await seasonImportVersionsCol(seasonId)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        seasonId: data.seasonId || seasonId,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        source: data.source,
        note: data.note,
        snapshotStats: {
          scheduleCount: data?.snapshotStats?.scheduleCount || 0,
          teamsCount: data?.snapshotStats?.teamsCount || 0,
          driversCount: data?.snapshotStats?.driversCount || 0,
        },
      } as SeasonImportVersion;
    });
  },

  getSeasonImportPayload: async (seasonId: string): Promise<SeasonImportPayload> => {
    const [scheduleSnap, teamsSnap, driversSnap] = await Promise.all([
      firestore.collection(`seasons/${seasonId}/schedule`).orderBy("id").get(),
      firestore.collection(`seasons/${seasonId}/teams`).get(),
      firestore.collection(`seasons/${seasonId}/drivers`).get(),
    ]);

    const schedule = scheduleSnap.docs.map((doc) =>
      stripUndefinedDeep(doc.data() as GrandPrix)
    ) as GrandPrix[];
    const teams = teamsSnap.docs
      .map((doc) => stripUndefinedDeep(doc.data() as Team) as Team)
      .sort((a, b) => a.id.localeCompare(b.id));
    const drivers = driversSnap.docs
      .map((doc) => stripUndefinedDeep(doc.data() as Driver) as Driver)
      .sort((a, b) => a.id.localeCompare(b.id));

    return {
      schedule,
      teams,
      drivers,
    };
  },

  rollbackSeasonImportVersion: async (
    seasonId: string,
    versionId: string,
    options?: { createdBy?: string }
  ): Promise<void> => {
    const versionRef = seasonImportVersionsCol(seasonId).doc(versionId);
    const versionSnap = await versionRef.get();
    if (!versionSnap.exists) {
      throw new Error(`No existe la version ${versionId} para la temporada ${seasonId}.`);
    }

    const raw = versionSnap.data() as any;
    const payload = raw?.snapshot as SeasonImportPayload | undefined;
    const validation = validateSeasonImportPayload(payload);
    if (!validation.isValid) {
      const error: any = new Error("La version seleccionada contiene datos invalidos y no puede restaurarse.");
      error.validation = validation;
      throw error;
    }

    const dryRun = await db.getSeasonImportDryRun(seasonId, payload as SeasonImportPayload);
    await createSeasonImportSnapshot(seasonId, {
      createdBy: options?.createdBy,
      source: "rollback-backup",
      note: `Backup previo a rollback hacia ${versionId}`,
      dryRun: {
        seasonId: dryRun.seasonId,
        generatedAt: dryRun.generatedAt,
        collections: dryRun.collections,
      },
    });

    await Promise.all([
      replaceCollectionData(
        firestore.collection(`seasons/${seasonId}/schedule`),
        payload!.schedule,
        (gp) => String(gp.id),
        `seasons/${seasonId}/schedule`
      ),
      replaceCollectionData(
        firestore.collection(`seasons/${seasonId}/teams`),
        payload!.teams,
        (team) => team.id,
        `seasons/${seasonId}/teams`
      ),
      replaceCollectionData(
        firestore.collection(`seasons/${seasonId}/drivers`),
        payload!.drivers,
        (driver) => driver.id,
        `seasons/${seasonId}/drivers`
      ),
    ]);

    clearActiveSeasonCache();
  },

  // --- SEASONAL DATA ---

  // Catalogue (Now Season-Aware)
  getTeams: async (): Promise<Team[]> => {
      const teamsCol = await getSeasonCollection('teams');
      if (!teamsCol) return [];
      const snapshot = await teamsCol.get();
      return snapshot.docs.map(doc => doc.data() as Team);
  },
  getTeamsForSeason: async (seasonId: string): Promise<Team[]> => {
      const teamsCol = getSeasonCollectionById(seasonId, 'teams');
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
  getDriversForSeason: async (seasonId: string, activeOnly = false): Promise<Driver[]> => {
      const driversCol = getSeasonCollectionById(seasonId, 'drivers');
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
  getScheduleForSeason: async (seasonId: string): Promise<GrandPrix[]> => {
      const scheduleCol = getSeasonCollectionById(seasonId, 'schedule');
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
  getPredictionsForUserInSeason: async (seasonId: string, userId: string): Promise<Prediction[]> => {
    const predictionsCol = getSeasonCollectionById(seasonId, 'predictions');
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
  getPredictionsForGpInSeason: async (seasonId: string, gpId: number): Promise<Prediction[]> => {
      const predictionsCol = getSeasonCollectionById(seasonId, 'predictions');
      const q = predictionsCol.where("gpId", "==", gpId);
      const snapshot = await q.get();
      return snapshot.docs.map(doc => doc.data() as Prediction);
  },
  // Public snapshots (precomputed and safe to expose)
  getPublicLeaderboard: async (seasonId: string): Promise<PublicStanding[]> => {
      const snapshot = await publicLeaderboardCol(seasonId).orderBy('totalPoints', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as PublicStanding);
  },
  getPublicLeaderboardForActiveSeason: async (): Promise<PublicStanding[]> => {
      const seasonId = await getActiveSeason();
      if (!seasonId) return [];
      const snapshot = await publicLeaderboardCol(seasonId).orderBy('totalPoints', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as PublicStanding);
  },
  getPublicConstructorsLeaderboard: async (seasonId: string): Promise<PublicConstructorStanding[]> => {
      const snapshot = await publicConstructorsLeaderboardCol(seasonId).orderBy('totalPoints', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as PublicConstructorStanding);
  },
  getPublicConstructorsLeaderboardForActiveSeason: async (): Promise<PublicConstructorStanding[]> => {
      const seasonId = await getActiveSeason();
      if (!seasonId) return [];
      const snapshot = await publicConstructorsLeaderboardCol(seasonId).orderBy('totalPoints', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as PublicConstructorStanding);
  },
  getPublicGpStandings: async (seasonId: string, gpId: number): Promise<PublicStanding[]> => {
      const snapshot = await publicGpStandingsCol(seasonId, gpId).orderBy('totalPoints', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as PublicStanding);
  },
  publishPublicGpStandings: async (gpId: number, seasonIdOverride?: string): Promise<number> => {
      const seasonId = seasonIdOverride || await getActiveSeason();
      if (!seasonId) throw new Error('No hay temporada activa para publicar standings por GP.');

      const [predictionsSnap, resultSnap, gpSnap] = await Promise.all([
          firestore.collection(`seasons/${seasonId}/predictions`).where('gpId', '==', gpId).get(),
          firestore.collection(`seasons/${seasonId}/results`).doc(String(gpId)).get(),
          firestore.collection(`seasons/${seasonId}/schedule`).doc(String(gpId)).get(),
      ]);

      if (!resultSnap.exists) {
          console.warn(`No hay resultado oficial para GP ${gpId}. No se publican standings por GP.`);
          return 0;
      }

      const result = resultSnap.data() as OfficialResult;
      const gp: GrandPrix = gpSnap.exists
          ? (gpSnap.data() as GrandPrix)
          : {
              id: gpId,
              name: `GP ${gpId}`,
              country: '',
              track: '',
              events: { quali: '', race: '' },
              hasSprint: !!result.sprintPole || !!result.sprintPodium,
          };

      const predictions = predictionsSnap.docs.map(d => d.data() as Prediction);
      const userIds = [...new Set(predictions.map(p => p.userId))];
      const users = await db.getUsersByIds(userIds);
      const userMap = new Map(users.map(u => [u.id, u]));

      const standings: PublicStanding[] = predictions.map(prediction => {
          const user = userMap.get(prediction.userId);
          if (!user) return null;
          const score = engine.calculateGpScore(gp, prediction, result);
          const details = {
              exactPole: result.pole && result.pole === prediction.pole ? 1 : 0,
              exactFastestLap: result.fastestLap && result.fastestLap === prediction.fastestLap ? 1 : 0,
              exactP1: result.racePodium && prediction.racePodium && result.racePodium[0] === prediction.racePodium[0] ? 1 : 0,
          };
          return {
              userId: user.id,
              userUsername: user.username,
              userAvatar: user.avatar,
              totalPoints: score.totalPoints,
              details,
          } as PublicStanding;
      }).filter(Boolean) as PublicStanding[];

      const colRef = publicGpStandingsCol(seasonId, gpId);
      const batch = firestore.batch();
      const existing = await colRef.get();
      existing.forEach(doc => batch.delete(doc.ref));

      standings.forEach(s => {
          const docRef = colRef.doc(s.userId || colRef.doc().id);
          batch.set(docRef, s);
      });

      await batch.commit();
      return standings.length;
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
  getOfficialResultsForSeason: async (seasonId: string): Promise<OfficialResult[]> => {
      const resultsCol = getSeasonCollectionById(seasonId, 'results');
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
  getOfficialResultForSeason: async (seasonId: string, gpId: number): Promise<OfficialResult | undefined> => {
      const resultsCol = getSeasonCollectionById(seasonId, 'results');
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
    // Refresh GP public standings for this GP.
    await db.publishPublicGpStandings(result.gpId);
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

  /**
   * Calculates standings for a specific season id (used for off-season/wrapped).
   */
  calculateSeasonTotalsForSeason: async (seasonId: string): Promise<SeasonTotal[]> => {
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

  /**
   * Calcula constructores para una temporada usando solo puntos de predicción.
   */
  calculateConstructorsStandingsForSeason: async (seasonId: string): Promise<ConstructorStanding[]> => {
    const [usersSnap, teamsSnap, scheduleSnap, predictionsSnap, resultsSnap] = await Promise.all([
        usersCol.get(),
        firestore.collection(`seasons/${seasonId}/teams`).get(),
        firestore.collection(`seasons/${seasonId}/schedule`).get(),
        firestore.collection(`seasons/${seasonId}/predictions`).get(),
        firestore.collection(`seasons/${seasonId}/results`).get(),
    ]);

    const users = usersSnap.docs.map(d => applyUsernameFallback(d.data() as User));
    const teams = teamsSnap.docs.map(d => d.data() as Team);
    const schedule = scheduleSnap.docs.map(d => d.data() as GrandPrix);
    const predictions = predictionsSnap.docs.map(d => d.data() as Prediction);
    const officialResults = resultsSnap.docs.map(d => d.data() as OfficialResult);

    return engine.calculateConstructorsStandings(teams, users, predictions, officialResults, schedule);
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
      if (!isDev || !allowClientSeed) {
          throw new Error("seedFirebase est\u00e1 deshabilitado en este entorno. Solo se permite en desarrollo con VITE_ALLOW_CLIENT_SEED=true.");
      }
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

  /**
   * Generates a simple "wrapped" summary for a user for a given season (defaults to last inactive, fallback active).
   */
  generateUserWrappedData: async (userId: string, seasonIdOverride?: string) => {
      const seasonId = seasonIdOverride || await getLastInactiveSeasonId() || await getActiveSeason();
      if (!seasonId) {
          throw new Error("No hay temporada disponible para generar el resumen.");
      }

      const [predictions, results, standings, schedule, drivers] = await Promise.all([
          db.getPredictionsForUserInSeason(seasonId, userId),
          db.getOfficialResultsForSeason(seasonId),
          db.calculateSeasonTotalsForSeason(seasonId),
          db.getScheduleForSeason(seasonId),
          db.getDriversForSeason(seasonId),
      ]);

      const totalPoints = standings.find(s => s.userId === userId)?.totalPoints || 0;

      let bestGp = { gpName: 'Sin datos', points: 0 };
      for (const prediction of predictions) {
          const result = results.find(r => r.gpId === prediction.gpId);
          const gp = schedule.find(g => g.id === prediction.gpId);
          if (!result || !gp) continue;
          const score = await engine.calculateGpScore(gp, prediction, result);
          if (score && score.totalPoints > bestGp.points) {
              bestGp = { gpName: gp.name, points: score.totalPoints };
          }
      }

      const driverUsage: Record<string, number> = {};
      const inc = (id?: string | null) => { if (id) driverUsage[id] = (driverUsage[id] || 0) + 1; };
      predictions.forEach(p => {
          inc(p.pole);
          inc(p.fastestLap);
          inc(p.driverOfTheDay);
          p.racePodium?.forEach(inc);
          p.sprintPodium?.forEach(inc);
      });
      const driverNameById = (id?: string) => drivers.find(d => d.id === id)?.name || 'N/A';
      const favoriteDriverId = Object.keys(driverUsage).sort((a, b) => (driverUsage[b] || 0) - (driverUsage[a] || 0))[0];
      const favoriteDriver = driverNameById(favoriteDriverId);

      const nemesisCount: Record<string, number> = {};
      predictions.forEach(p => {
          const result = results.find(r => r.gpId === p.gpId);
          if (result && p.pole && result.pole && p.pole !== result.pole) {
              nemesisCount[p.pole] = (nemesisCount[p.pole] || 0) + 1;
          }
      });
      const nemesisId = Object.keys(nemesisCount).sort((a, b) => (nemesisCount[b] || 0) - (nemesisCount[a] || 0))[0];
      const nemesisDriver = driverNameById(nemesisId);

      let poleHits = 0;
      let podiumHits = 0;
      predictions.forEach(p => {
          const result = results.find(r => r.gpId === p.gpId);
          if (!result) return;
          if (p.pole && result.pole && p.pole === result.pole) poleHits += 1;
          if (p.racePodium && result.racePodium) {
              const exact = p.racePodium.filter((d, i) => result.racePodium?.[i] === d).length;
              podiumHits += exact;
          }
      });

      return {
          totalPoints: { label: 'Puntos totales', value: totalPoints, description: 'Lo que sumaste en la temporada.' },
          bestGp: { label: 'Tu mejor GP', value: bestGp },
          favoriteDriver: { label: 'Piloto favorito', value: favoriteDriver, description: 'El que más elegiste en tus predicciones.' },
          nemesisDriver: { label: 'Piloto némesis', value: nemesisDriver, description: 'Te falló en las poles más veces.' },
          polePositionHits: { label: 'Poles acertadas', value: poleHits, description: 'Predicciones de pole correctas.' },
          podiumHits: { label: 'Podios exactos', value: podiumHits, description: 'Posiciones exactas que acertaste en podios.' },
      };
  },

  /**
   * Publica un leaderboard público (sanitizado) para una temporada (por defecto la activa).
   */
  publishPublicLeaderboard: async (seasonIdOverride?: string): Promise<number> => {
      const seasonId = seasonIdOverride || await getActiveSeason();
      if (!seasonId) throw new Error('No hay temporada activa para publicar leaderboard público.');

      const standings = await db.calculateSeasonTotalsForSeason(seasonId);
      const constructorsStandings = await db.calculateConstructorsStandingsForSeason(seasonId);
      const batch = firestore.batch();

      const colRef = publicLeaderboardCol(seasonId);
      const existing = await colRef.get();
      existing.forEach(doc => batch.delete(doc.ref));

      standings.forEach(s => {
          const docRef = colRef.doc(s.userId || colRef.doc().id);
          const entry: PublicStanding = {
              userId: s.userId,
              userUsername: s.userUsername,
              userAvatar: s.userAvatar,
              totalPoints: s.totalPoints,
              details: s.details,
          };
          batch.set(docRef, entry);
      });

      const constructorsColRef = publicConstructorsLeaderboardCol(seasonId);
      const existingConstructors = await constructorsColRef.get();
      existingConstructors.forEach(doc => batch.delete(doc.ref));

      constructorsStandings.forEach((s) => {
          const docRef = constructorsColRef.doc(s.teamId || constructorsColRef.doc().id);
          const entry: PublicConstructorStanding = {
              teamId: s.teamId,
              teamName: s.teamName,
              teamColor: s.teamColor,
              totalPoints: s.totalPoints,
              supporters: s.supporters,
              sourceUserPoints: s.sourceUserPoints,
          };
          batch.set(docRef, entry);
      });

      await batch.commit();
      return standings.length;
  },

  /**
   * Importa calendario, equipos y pilotos desde la API Ergast para una temporada dada.
   * Pensado como importador rápido anual desde el panel admin.
   */
  importSeasonDataFromErgast: async (seasonId: string): Promise<void> => {
      const base = `https://ergast.com/api/f1/${seasonId}`;
      const fetchJson = async (url: string) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Fallo al obtener ${url}: ${res.status}`);
          return res.json();
      };

      const toIso = (date?: string, time?: string) => {
          if (!date) return '';
          const t = time || '12:00:00Z';
          return new Date(`${date}T${t}`).toISOString();
      };

      // Schedule
      const scheduleData = await fetchJson(`${base}.json`);
      const races = scheduleData?.MRData?.RaceTable?.Races || [];
      const schedule: GrandPrix[] = races.map((r: any) => ({
          id: parseInt(r.round, 10),
          name: r.raceName,
          country: r.Circuit?.Location?.country || '',
          track: r.Circuit?.circuitName || '',
          hasSprint: !!r.Sprint,
          events: {
              quali: toIso(r.Qualifying?.date, r.Qualifying?.time) || toIso(r.date, r.time),
              sprintQuali: r.Sprint ? toIso(r.Sprint.date, r.Sprint.time) : undefined,
              sprint: r.Sprint ? toIso(r.Sprint.date, r.Sprint.time) : undefined,
              race: toIso(r.date, r.time),
          },
      })).sort((a: GrandPrix, b: GrandPrix) => a.id - b.id);

      // Teams
      const constructorsData = await fetchJson(`${base}/constructors.json`);
      const constructors = constructorsData?.MRData?.ConstructorTable?.Constructors || [];
      const teams: Team[] = constructors.map((c: any) => ({
          id: c.constructorId,
          name: c.name,
          color: '#888888',
      }));

      // Drivers with constructor from standings
      const standingsData = await fetchJson(`${base}/driverStandings.json`);
      const standingsList = standingsData?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
      const drivers: Driver[] = standingsList.map((d: any) => ({
          id: d.Driver?.driverId,
          name: `${d.Driver?.givenName || ''} ${d.Driver?.familyName || ''}`.trim(),
          teamId: d.Constructors?.[0]?.constructorId || '',
          isActive: true,
      }));

      await db.importSeasonDataFromJson(
        seasonId,
        { schedule, teams, drivers },
        { source: "ergast", note: `Importado automaticamente desde Ergast ${seasonId}` }
      );
  },

  /**
   * Importa calendario, equipos y pilotos desde un JSON ya estructurado.
   * Estructura esperada: { schedule: GrandPrix[], teams: Team[], drivers: Driver[] }
   */
  importSeasonDataFromJson: async (
    seasonId: string,
    payload: SeasonImportPayload,
    options?: { createdBy?: string; source?: string; note?: string }
  ): Promise<{ backupVersionId: string; dryRun: SeasonImportDryRun }> => {
      const validation = validateSeasonImportPayload(payload);
      if (!validation.isValid) {
          const error: any = new Error("JSON inválido. Revisa los campos marcados.");
          error.validation = validation;
          throw error;
      }

      const dryRun = await db.getSeasonImportDryRun(seasonId, payload);
      const backupVersionId = await createSeasonImportSnapshot(seasonId, {
          createdBy: options?.createdBy,
          source: options?.source || "json-file",
          note: options?.note,
          dryRun: {
              seasonId: dryRun.seasonId,
              generatedAt: dryRun.generatedAt,
              collections: dryRun.collections,
          },
      });

      await Promise.all([
          replaceCollectionData(
            firestore.collection(`seasons/${seasonId}/schedule`),
            payload.schedule,
            (gp) => String(gp.id),
            `seasons/${seasonId}/schedule`
          ),
          replaceCollectionData(
            firestore.collection(`seasons/${seasonId}/teams`),
            payload.teams,
            (team) => team.id,
            `seasons/${seasonId}/teams`
          ),
          replaceCollectionData(
            firestore.collection(`seasons/${seasonId}/drivers`),
            payload.drivers,
            (driver) => driver.id,
            `seasons/${seasonId}/drivers`
          ),
      ]);

      clearActiveSeasonCache();
      return { backupVersionId, dryRun };
  },

  /**
   * Importa datos de temporada desde una URL (JSON) y los aplica a la temporada indicada.
   */
  importSeasonDataFromUrl: async (seasonId: string, url: string): Promise<void> => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`No se pudo obtener el JSON (${res.status})`);
      const data = await res.json();
      await db.importSeasonDataFromJson(seasonId, data as SeasonImportPayload, {
        source: "json-url",
        note: `Importado desde URL: ${url}`,
      });
  },
};
