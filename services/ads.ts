import { AdCampaign, AdImageOrientation, AdPlacement } from '../types';

export const AD_PLACEMENTS: Array<{ id: AdPlacement; label: string; description: string }> = [
  {
    id: 'home_leaderboard_inline',
    label: 'Home - tabla general',
    description: 'Banner debajo de la tabla de temporada en la pantalla de inicio.',
  },
  {
    id: 'search_bottom',
    label: 'Buscar usuarios - pie',
    description: 'Banner al final de la pantalla de búsqueda de usuarios.',
  },
  {
    id: 'tournaments_bottom',
    label: 'Torneos - pie',
    description: 'Banner al final del listado principal de torneos.',
  },
  {
    id: 'profile_bottom',
    label: 'Perfil - pie',
    description: 'Banner al final de la vista de perfil público/propio.',
  },
];

export const formatCtr = (clicks: number, impressions: number): number => {
  if (impressions <= 0) return 0;
  return Number(((clicks / impressions) * 100).toFixed(2));
};

export const toMillis = (value: any): number | null => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  return null;
};

export const isCampaignLive = (campaign: AdCampaign, nowMs = Date.now()): boolean => {
  if (campaign.status !== 'active') return false;
  const startMs = toMillis(campaign.startAt);
  const endMs = toMillis(campaign.endAt);
  if (startMs !== null && nowMs < startMs) return false;
  if (endMs !== null && nowMs > endMs) return false;
  return Array.isArray(campaign.placements) && campaign.placements.length > 0;
};

export const pickCampaignForPlacement = (
  campaigns: AdCampaign[],
  placement: AdPlacement
): AdCampaign | null => {
  const eligible = campaigns.filter(
    (campaign) => campaign.placements.includes(placement) && isCampaignLive(campaign)
  );
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];

  const weighted = eligible.map((campaign) => ({
    campaign,
    weight: Math.max(1, Number(campaign.priority) || 1),
  }));
  const totalWeight = weighted.reduce((acc, item) => acc + item.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.campaign;
  }
  return weighted[0].campaign;
};

export const getOrCreateAdSessionId = (): string => {
  if (typeof window === 'undefined') return 'web-unknown';
  const key = 'boxbox_ad_session_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `ad_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, next);
  return next;
};

export const detectOrientationFromSize = (width: number, height: number): AdImageOrientation => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'horizontal';
  }
  const ratio = width / height;
  if (ratio >= 1.15) return 'horizontal';
  if (ratio <= 0.85) return 'vertical';
  return 'square';
};

const BASE_BOX = {
  horizontal: { desktopWidth: 208, desktopHeight: 112, mobileHeight: 144 },
  vertical: { desktopWidth: 148, desktopHeight: 210, mobileHeight: 210 },
  square: { desktopWidth: 168, desktopHeight: 168, mobileHeight: 180 },
};

const clampScale = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return 100;
  return Math.max(50, Math.min(180, Number(value)));
};

export const getAdImageBoxSize = (params: {
  orientation: AdImageOrientation;
  desktopScale?: number;
  mobileScale?: number;
}) => {
  const base = BASE_BOX[params.orientation] || BASE_BOX.horizontal;
  const desktopFactor = clampScale(params.desktopScale) / 100;
  const mobileFactor = clampScale(params.mobileScale) / 100;

  return {
    desktopWidth: Math.round(base.desktopWidth * desktopFactor),
    desktopHeight: Math.round(base.desktopHeight * desktopFactor),
    mobileHeight: Math.round(base.mobileHeight * mobileFactor),
  };
};
