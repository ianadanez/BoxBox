import { FavoriteTeamAssignment, User } from "../types";

const toIsoString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof value === "object" && value !== null && "toDate" in (value as any)) {
    try {
      const parsed = (value as any).toDate();
      if (parsed instanceof Date && !Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch {
      return null;
    }
  }
  return null;
};

const cleanHistory = (history: FavoriteTeamAssignment[]): FavoriteTeamAssignment[] => {
  const sorted = [...history].sort(
    (a, b) => new Date(a.from).getTime() - new Date(b.from).getTime()
  );
  const deduped: FavoriteTeamAssignment[] = [];
  sorted.forEach((entry) => {
    const last = deduped[deduped.length - 1];
    if (!last || last.teamId !== entry.teamId) {
      deduped.push(entry);
    }
  });
  return deduped;
};

export const normalizeFavoriteTeamHistory = (
  user: Pick<User, "favoriteTeamId" | "favoriteTeamHistory" | "createdAt">
): FavoriteTeamAssignment[] => {
  const fromHistory = Array.isArray(user.favoriteTeamHistory)
    ? user.favoriteTeamHistory
        .map((entry) => ({
          teamId: entry?.teamId?.trim?.() || "",
          from: toIsoString(entry?.from) || "",
        }))
        .filter((entry) => entry.teamId && entry.from)
    : [];

  if (fromHistory.length > 0) {
    return cleanHistory(fromHistory);
  }

  if (user.favoriteTeamId) {
    const fallbackFrom = toIsoString(user.createdAt) || new Date().toISOString();
    return [{ teamId: user.favoriteTeamId, from: fallbackFrom }];
  }

  return [];
};

export const appendFavoriteTeamAssignment = (
  user: Pick<User, "favoriteTeamId" | "favoriteTeamHistory" | "createdAt">,
  teamId: string,
  effectiveAt: string = new Date().toISOString()
): FavoriteTeamAssignment[] => {
  const normalizedTeamId = teamId.trim();
  if (!normalizedTeamId) return normalizeFavoriteTeamHistory(user);

  const history = normalizeFavoriteTeamHistory(user);
  const last = history[history.length - 1];
  if (last?.teamId === normalizedTeamId) {
    return history;
  }

  return cleanHistory([
    ...history,
    {
      teamId: normalizedTeamId,
      from: toIsoString(effectiveAt) || new Date().toISOString(),
    },
  ]);
};

export const resolveFavoriteTeamAt = (
  history: FavoriteTeamAssignment[],
  at: string | number
): string | undefined => {
  const target = typeof at === "number" ? at : new Date(at).getTime();
  if (!Number.isFinite(target) || !history.length) return undefined;

  let selected: FavoriteTeamAssignment | undefined;
  history.forEach((entry) => {
    const fromTs = new Date(entry.from).getTime();
    if (!Number.isFinite(fromTs)) return;
    if (fromTs <= target) {
      selected = entry;
    }
  });

  return selected?.teamId || history[0]?.teamId;
};
