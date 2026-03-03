import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import {
  AdCampaign,
  AdCampaignPayload,
  AdCampaignStatus,
  AdImageOrientation,
  AdImageOrientationMode,
  AdPlacement,
} from '../types';
import {
  AD_PLACEMENTS,
  detectOrientationFromSize,
  getAdImageBoxSize,
} from '../services/ads';

type FormState = {
  name: string;
  sponsorName: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  ctaText: string;
  placements: Set<AdPlacement>;
  status: AdCampaignStatus;
  priority: number;
  startAt: string;
  endAt: string;
  imageFit: 'cover' | 'contain';
  focalPointX: number;
  focalPointY: number;
  imageOrientationMode: AdImageOrientationMode;
  imageScaleDesktop: number;
  imageScaleMobile: number;
};

type ImageDiagnostics = {
  source: 'url' | 'file';
  key: string;
  width: number;
  height: number;
  bytes?: number;
  mimeType?: string;
  orientation: AdImageOrientation;
  warnings: string[];
  errors: string[];
};

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const MIN_IMAGE_WIDTH = 1200;
const RECOMMENDED_RATIO = 1.85;

const DEFAULT_FORM: FormState = {
  name: '',
  sponsorName: '',
  title: '',
  description: '',
  imageUrl: '',
  targetUrl: '',
  ctaText: '',
  placements: new Set<AdPlacement>(),
  status: 'draft',
  priority: 1,
  startAt: '',
  endAt: '',
  imageFit: 'cover',
  focalPointX: 50,
  focalPointY: 50,
  imageOrientationMode: 'auto',
  imageScaleDesktop: 100,
  imageScaleMobile: 100,
};

const toInputDateTime = (value: any): string => {
  if (!value) return '';
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseInputDateTime = (value: string): Date | null => {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const statusBadgeClass: Record<AdCampaignStatus, string> = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  draft: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  paused: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  archived: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

const getImageMetrics = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    image.src = src;
  });
};

const normalizeImageDiagnostics = (input: {
  source: 'url' | 'file';
  key: string;
  width: number;
  height: number;
  bytes?: number;
  mimeType?: string;
}): ImageDiagnostics => {
  const warnings: string[] = [];
  const errors: string[] = [];

  const ratio = input.height > 0 ? input.width / input.height : 0;
  const orientation = detectOrientationFromSize(input.width, input.height);
  if (input.width < MIN_IMAGE_WIDTH) {
    errors.push(`La imagen debe tener al menos ${MIN_IMAGE_WIDTH}px de ancho.`);
  }
  if (ratio > 0 && Math.abs(ratio - RECOMMENDED_RATIO) > 0.35) {
    warnings.push('El ratio no es ideal para este layout. Puede haber recortes visibles.');
  }
  if (input.bytes && input.bytes > MAX_IMAGE_BYTES) {
    errors.push(`La imagen supera el maximo permitido (${formatBytes(MAX_IMAGE_BYTES)}).`);
  }

  return {
    ...input,
    orientation,
    warnings,
    errors,
  };
};

const AdsManagement: React.FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rangeDays, setRangeDays] = useState(30);
  const [metricsByCampaign, setMetricsByCampaign] = useState<Record<string, { impressions: number; clicks: number; ctr: number; byPlacement: Record<string, { impressions: number; clicks: number; ctr: number }> }>>({});
  const [totals, setTotals] = useState({ impressions: 0, clicks: 0, ctr: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [previewPlacement, setPreviewPlacement] = useState<AdPlacement>('home_leaderboard_inline');

  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [localPreviewName, setLocalPreviewName] = useState<string>('');
  const [imageDiagnostics, setImageDiagnostics] = useState<ImageDiagnostics | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupObjectUrl();
    };
  }, [cleanupObjectUrl]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [campaignList, report] = await Promise.all([
      db.listAdCampaignsForAdmin(),
      db.getAdAnalyticsReport(rangeDays),
    ]);
    setCampaigns(campaignList);
    setTotals({
      impressions: report.totalImpressions,
      clicks: report.totalClicks,
      ctr: report.ctr,
    });
    const map: Record<string, { impressions: number; clicks: number; ctr: number; byPlacement: Record<string, { impressions: number; clicks: number; ctr: number }> }> = {};
    report.campaigns.forEach((entry) => {
      map[entry.campaignId] = {
        impressions: entry.impressions,
        clicks: entry.clicks,
        ctr: entry.ctr,
        byPlacement: Object.entries(entry.byPlacement || {}).reduce<Record<string, { impressions: number; clicks: number; ctr: number }>>((acc, [placement, value]) => {
          acc[placement] = {
            impressions: value?.impressions || 0,
            clicks: value?.clicks || 0,
            ctr: value?.ctr || 0,
          };
          return acc;
        }, {}),
      };
    });
    setMetricsByCampaign(map);
    setLoading(false);
  }, [rangeDays]);

  useEffect(() => {
    reload();
  }, [reload]);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setPreviewPlacement('home_leaderboard_inline');
    setImageDiagnostics(null);
    setLocalPreviewName('');
    setLocalPreviewUrl('');
    cleanupObjectUrl();
  }, [cleanupObjectUrl]);

  const analyzeUrlImage = useCallback(async (): Promise<ImageDiagnostics | null> => {
    const imageUrl = form.imageUrl.trim();
    if (!imageUrl) {
      setImageDiagnostics(null);
      return null;
    }
    setAnalyzingImage(true);
    try {
      const metrics = await getImageMetrics(imageUrl);
      const diagnostics = normalizeImageDiagnostics({
        source: 'url',
        key: imageUrl,
        width: metrics.width,
        height: metrics.height,
      });
      setImageDiagnostics(diagnostics);
      return diagnostics;
    } catch (error) {
      const diagnostics: ImageDiagnostics = {
        source: 'url',
        key: imageUrl,
        width: 0,
        height: 0,
        orientation: 'horizontal',
        warnings: [],
        errors: ['No se pudo analizar la URL de imagen. Verifica que sea publica y valida.'],
      };
      setImageDiagnostics(diagnostics);
      return diagnostics;
    } finally {
      setAnalyzingImage(false);
    }
  }, [form.imageUrl]);

  const handleLocalImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    cleanupObjectUrl();
    setImageDiagnostics(null);

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImageDiagnostics({
        source: 'file',
        key: `${file.name}:${file.size}`,
        width: 0,
        height: 0,
        bytes: file.size,
        mimeType: file.type,
        orientation: 'horizontal',
        warnings: [],
        errors: ['Formato no permitido. Usa JPG, PNG o WEBP.'],
      });
      setLocalPreviewName(file.name);
      setLocalPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLocalPreviewUrl(url);
    setLocalPreviewName(file.name);

    setAnalyzingImage(true);
    try {
      const metrics = await getImageMetrics(url);
      setImageDiagnostics(
        normalizeImageDiagnostics({
          source: 'file',
          key: `${file.name}:${file.size}`,
          width: metrics.width,
          height: metrics.height,
          bytes: file.size,
          mimeType: file.type,
        })
      );
    } catch (error) {
      setImageDiagnostics({
        source: 'file',
        key: `${file.name}:${file.size}`,
        width: 0,
        height: 0,
        bytes: file.size,
        mimeType: file.type,
        orientation: 'horizontal',
        warnings: [],
        errors: ['No se pudo leer el archivo local.'],
      });
    } finally {
      setAnalyzingImage(false);
    }
  };

  const startEdit = (campaign: AdCampaign) => {
    cleanupObjectUrl();
    setLocalPreviewUrl('');
    setLocalPreviewName('');
    setImageDiagnostics(null);

    setEditingId(campaign.id);
    setForm({
      name: campaign.name || '',
      sponsorName: campaign.sponsorName || '',
      title: campaign.title || '',
      description: campaign.description || '',
      imageUrl: campaign.imageUrl || '',
      targetUrl: campaign.targetUrl || '',
      ctaText: campaign.ctaText || '',
      placements: new Set<AdPlacement>(campaign.placements || []),
      status: campaign.status || 'draft',
      priority: Number(campaign.priority) || 1,
      startAt: toInputDateTime(campaign.startAt),
      endAt: toInputDateTime(campaign.endAt),
      imageFit: campaign.imageFit === 'contain' ? 'contain' : 'cover',
      focalPointX: Number.isFinite(campaign.focalPointX) ? Number(campaign.focalPointX) : 50,
      focalPointY: Number.isFinite(campaign.focalPointY) ? Number(campaign.focalPointY) : 50,
      imageOrientationMode:
        campaign.imageOrientationMode === 'horizontal' ||
        campaign.imageOrientationMode === 'vertical' ||
        campaign.imageOrientationMode === 'square'
          ? campaign.imageOrientationMode
          : 'auto',
      imageScaleDesktop: Number.isFinite(campaign.imageScaleDesktop) ? Number(campaign.imageScaleDesktop) : 100,
      imageScaleMobile: Number.isFinite(campaign.imageScaleMobile) ? Number(campaign.imageScaleMobile) : 100,
    });

    if (campaign.placements?.length) {
      setPreviewPlacement(campaign.placements[0]);
    }
  };

  const handlePlacementToggle = (placementId: AdPlacement) => {
    setForm((prev) => {
      const next = new Set(prev.placements);
      if (next.has(placementId)) next.delete(placementId);
      else next.add(placementId);
      return { ...prev, placements: next };
    });
  };

  const validateBeforeSave = async (): Promise<string[]> => {
    const errors: string[] = [];

    if (!form.name.trim()) errors.push('El nombre interno es obligatorio.');
    if (!form.title.trim()) errors.push('El titulo visible es obligatorio.');
    if (!form.targetUrl.trim()) errors.push('La URL de destino es obligatoria.');

    const imageUrl = form.imageUrl.trim();
    if (form.status === 'active' && !imageUrl) {
      errors.push('Una campana activa requiere URL de imagen.');
    }

    let currentDiagnostics = imageDiagnostics;
    if (imageUrl && (!currentDiagnostics || currentDiagnostics.key !== imageUrl || currentDiagnostics.source !== 'url')) {
      currentDiagnostics = await analyzeUrlImage();
    }
    if (currentDiagnostics?.errors?.length) {
      errors.push(...currentDiagnostics.errors);
    }

    if (form.status === 'active' && form.placements.size === 0) {
      errors.push('Una campana activa requiere al menos un slot seleccionado.');
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const validationErrors = await validateBeforeSave();
      if (validationErrors.length) {
        alert(validationErrors.join('\n'));
        return;
      }

      const payload: AdCampaignPayload = {
        name: form.name,
        sponsorName: form.sponsorName || undefined,
        title: form.title,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        imageFit: form.imageFit,
        focalPointX: form.focalPointX,
        focalPointY: form.focalPointY,
        imageOrientationMode: form.imageOrientationMode,
        imageScaleDesktop: form.imageScaleDesktop,
        imageScaleMobile: form.imageScaleMobile,
        targetUrl: form.targetUrl,
        ctaText: form.ctaText || undefined,
        placements: Array.from(form.placements),
        status: form.status,
        priority: form.priority,
        startAt: parseInputDateTime(form.startAt),
        endAt: parseInputDateTime(form.endAt),
      };

      if (editingId) {
        await db.updateAdCampaign(editingId, payload, user.id);
      } else {
        await db.createAdCampaign(payload, user.id);
      }
      resetForm();
      await reload();
    } catch (error: any) {
      alert(error?.message || 'No se pudo guardar la campana.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (campaign: AdCampaign) => {
    if (!user) return;
    if (!window.confirm(`Archivar campana "${campaign.name}"?`)) return;
    await db.archiveAdCampaign(campaign.id, user.id);
    if (editingId === campaign.id) resetForm();
    await reload();
  };

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return (Number(b.priority) || 0) - (Number(a.priority) || 0);
    });
  }, [campaigns]);

  const placementLabelById = useMemo(() => {
    return AD_PLACEMENTS.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.label;
      return acc;
    }, {});
  }, []);

  const previewImageUrl = localPreviewUrl || form.imageUrl.trim();
  const imagePosition = `${Math.max(0, Math.min(100, form.focalPointX))}% ${Math.max(0, Math.min(100, form.focalPointY))}%`;
  const detectedOrientation: AdImageOrientation = imageDiagnostics?.orientation || 'horizontal';
  const effectiveOrientation: AdImageOrientation =
    form.imageOrientationMode === 'auto' ? detectedOrientation : form.imageOrientationMode;
  const previewBoxSize = getAdImageBoxSize({
    orientation: effectiveOrientation,
    desktopScale: form.imageScaleDesktop,
    mobileScale: form.imageScaleMobile,
  });

  const previewSlotLabel = placementLabelById[previewPlacement] || previewPlacement;

  return (
    <div className="space-y-8">
      <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold f1-red-text">Banners publicitarios</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Gestiona campanas globales y trackea impresiones/clicks por slot.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-secondary)]">Rango:</label>
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(Number(e.target.value))}
              className="bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
            >
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>
            <button
              onClick={reload}
              className="px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--background-light)] hover:opacity-90"
            >
              Refrescar
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-4">
            <p className="text-sm text-[var(--text-secondary)]">Impresiones</p>
            <p className="text-2xl font-bold text-[var(--accent-blue)]">{totals.impressions}</p>
          </div>
          <div className="bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-4">
            <p className="text-sm text-[var(--text-secondary)]">Clicks</p>
            <p className="text-2xl font-bold text-[var(--accent-blue)]">{totals.clicks}</p>
          </div>
          <div className="bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-4">
            <p className="text-sm text-[var(--text-secondary)]">CTR</p>
            <p className="text-2xl font-bold text-[var(--accent-blue)]">{totals.ctr}%</p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
        <h3 className="text-xl font-bold mb-4">{editingId ? 'Editar campana' : 'Nueva campana'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Nombre interno</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Sponsor</label>
              <input
                value={form.sponsorName}
                onChange={(e) => setForm((prev) => ({ ...prev, sponsorName: e.target.value }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Titulo visible</label>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">CTA</label>
              <input
                value={form.ctaText}
                onChange={(e) => setForm((prev) => ({ ...prev, ctaText: e.target.value }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Descripcion</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">URL imagen</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={analyzeUrlImage}
                  className="px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--background-light)]"
                >
                  Analizar
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Debe ser publica y accesible por el navegador.</p>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Archivo local para preview</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLocalImageFile}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">Solo preview (JPG/PNG/WEBP, max {formatBytes(MAX_IMAGE_BYTES)}).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Ajuste de imagen</label>
              <select
                value={form.imageFit}
                onChange={(e) => setForm((prev) => ({ ...prev, imageFit: e.target.value === 'contain' ? 'contain' : 'cover' }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              >
                <option value="cover">Cover (recorta para llenar)</option>
                <option value="contain">Contain (sin recorte)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Orientacion</label>
              <select
                value={form.imageOrientationMode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    imageOrientationMode: e.target.value as AdImageOrientationMode,
                  }))
                }
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              >
                <option value="auto">Auto (detectar)</option>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="square">Cuadrada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Escala desktop ({Math.round(form.imageScaleDesktop)}%)</label>
              <input
                type="range"
                min={50}
                max={180}
                value={form.imageScaleDesktop}
                onChange={(e) => setForm((prev) => ({ ...prev, imageScaleDesktop: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Escala mobile ({Math.round(form.imageScaleMobile)}%)</label>
              <input
                type="range"
                min={50}
                max={180}
                value={form.imageScaleMobile}
                onChange={(e) => setForm((prev) => ({ ...prev, imageScaleMobile: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Focal X ({Math.round(form.focalPointX)}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.focalPointX}
                onChange={(e) => setForm((prev) => ({ ...prev, focalPointX: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Focal Y ({Math.round(form.focalPointY)}%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.focalPointY}
                onChange={(e) => setForm((prev) => ({ ...prev, focalPointY: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">URL destino</label>
              <input
                type="text"
                value={form.targetUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, targetUrl: e.target.value }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as AdCampaignStatus }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="active">Activa</option>
                <option value="paused">Pausada</option>
                <option value="archived">Archivada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Prioridad</label>
              <input
                type="number"
                min={1}
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: Number(e.target.value) || 1 }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Inicio</label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((prev) => ({ ...prev, startAt: e.target.value }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Fin</label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
                className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-2">Ubicaciones</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AD_PLACEMENTS.map((placement) => (
                <label
                  key={placement.id}
                  className="p-3 rounded-md border border-[var(--border-color)] bg-[var(--background-light)] text-sm"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.placements.has(placement.id)}
                      onChange={() => handlePlacementToggle(placement.id)}
                    />
                    <div>
                      <p className="font-semibold">{placement.label}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{placement.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[var(--border-color)] bg-[var(--background-light)] p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Control de imagen</p>
              {analyzingImage ? <p className="text-xs text-[var(--text-secondary)]">Analizando...</p> : null}
            </div>
            {localPreviewName ? <p className="text-xs text-[var(--text-secondary)]">Preview local: {localPreviewName}</p> : null}
            {imageDiagnostics ? (
              <>
                <p className="text-xs text-[var(--text-secondary)]">
                  {imageDiagnostics.width}x{imageDiagnostics.height}
                  {typeof imageDiagnostics.bytes === 'number' ? ` - ${formatBytes(imageDiagnostics.bytes)}` : ''}
                  {imageDiagnostics.mimeType ? ` - ${imageDiagnostics.mimeType}` : ''}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Detectada: <span className="font-semibold">{imageDiagnostics.orientation}</span> ·
                  Modo efectivo: <span className="font-semibold">{effectiveOrientation}</span>
                </p>
                {imageDiagnostics.errors.length > 0 ? (
                  <ul className="text-xs text-red-300 list-disc pl-5 space-y-1">
                    {imageDiagnostics.errors.map((error, index) => (
                      <li key={`img_error_${index}`}>{error}</li>
                    ))}
                  </ul>
                ) : null}
                {imageDiagnostics.warnings.length > 0 ? (
                  <ul className="text-xs text-yellow-300 list-disc pl-5 space-y-1">
                    {imageDiagnostics.warnings.map((warning, index) => (
                      <li key={`img_warning_${index}`}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                {imageDiagnostics.errors.length === 0 && imageDiagnostics.warnings.length === 0 ? (
                  <p className="text-xs text-green-300">Imagen validada correctamente.</p>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">Sin diagnostico de imagen.</p>
            )}
          </div>

          <div className="rounded-md border border-[var(--border-color)] bg-[var(--background-light)] p-4 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold">Previsualizador de banner</p>
                <p className="text-xs text-[var(--text-secondary)]">Vista real aproximada antes de guardar la campana.</p>
              </div>
              <select
                value={previewPlacement}
                onChange={(e) => setPreviewPlacement(e.target.value as AdPlacement)}
                className="bg-[var(--background-medium)] border border-[var(--border-color)] rounded-md px-3 py-2 text-sm"
              >
                {AD_PLACEMENTS.map((placement) => (
                  <option key={`preview_${placement.id}`} value={placement.id}>{placement.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Desktop ({previewSlotLabel})</p>
                <div className="w-full max-w-2xl">
                  <div className="block bg-[var(--background-medium)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                    <div className="px-4 pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Publicidad</p>
                    </div>
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      {previewImageUrl ? (
                        <div
                          className="relative w-full rounded-md border border-[var(--border-color)] overflow-hidden bg-[#0f1115]"
                          style={{
                            height: `${previewBoxSize.desktopHeight}px`,
                            width: `${previewBoxSize.desktopWidth}px`,
                            maxWidth: '100%',
                          }}
                        >
                          <img
                            src={previewImageUrl}
                            alt={form.title || 'Preview banner'}
                            className="w-full h-full"
                            style={{ objectFit: form.imageFit, objectPosition: imagePosition }}
                          />
                          <div className="pointer-events-none absolute inset-[10%] border border-dashed border-white/70 rounded-sm" />
                          <div
                            className="pointer-events-none absolute w-3 h-3 rounded-full border border-white bg-white/30"
                            style={{ left: `calc(${Math.max(0, Math.min(100, form.focalPointX))}% - 6px)`, top: `calc(${Math.max(0, Math.min(100, form.focalPointY))}% - 6px)` }}
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        {form.sponsorName ? <p className="text-xs uppercase tracking-wide text-[var(--accent-blue)] font-semibold mb-1">{form.sponsorName}</p> : null}
                        <h4 className="text-base font-bold text-[var(--text-primary)] leading-tight">{form.title || 'Titulo del banner'}</h4>
                        {form.description ? <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{form.description}</p> : null}
                        {form.ctaText ? <span className="inline-block mt-3 text-sm font-semibold text-[var(--accent-red)]">{form.ctaText} -&gt;</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Mobile ({previewSlotLabel})</p>
                <div className="w-full max-w-sm border border-[var(--border-color)] rounded-xl p-3 bg-[var(--background-medium)]">
                  <div className="block bg-[var(--background-medium)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                    <div className="px-4 pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Publicidad</p>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                      {previewImageUrl ? (
                        <div
                          className="relative w-full rounded-md border border-[var(--border-color)] overflow-hidden bg-[#0f1115]"
                          style={{ height: `${previewBoxSize.mobileHeight}px` }}
                        >
                          <img
                            src={previewImageUrl}
                            alt={form.title || 'Preview banner'}
                            className="w-full h-full"
                            style={{ objectFit: form.imageFit, objectPosition: imagePosition }}
                          />
                          <div className="pointer-events-none absolute inset-[10%] border border-dashed border-white/70 rounded-sm" />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        {form.sponsorName ? <p className="text-xs uppercase tracking-wide text-[var(--accent-blue)] font-semibold mb-1">{form.sponsorName}</p> : null}
                        <h4 className="text-base font-bold text-[var(--text-primary)] leading-tight">{form.title || 'Titulo del banner'}</h4>
                        {form.description ? <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-3">{form.description}</p> : null}
                        {form.ctaText ? <span className="inline-block mt-3 text-sm font-semibold text-[var(--accent-red)]">{form.ctaText} -&gt;</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[var(--accent-red)] text-white font-bold hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear campana'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-md border border-[var(--border-color)] bg-[var(--background-light)]"
              >
                Cancelar edicion
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
        <h3 className="text-xl font-bold mb-4">Campanas</h3>
        {loading ? (
          <p className="text-[var(--text-secondary)]">Cargando campanas...</p>
        ) : sortedCampaigns.length === 0 ? (
          <p className="text-[var(--text-secondary)]">Todavia no hay campanas creadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-[var(--border-color)]">
                <tr>
                  <th className="py-2 px-2">Campana</th>
                  <th className="py-2 px-2">Estado</th>
                  <th className="py-2 px-2">Slots</th>
                  <th className="py-2 px-2 text-right">Imp.</th>
                  <th className="py-2 px-2 text-right">Clicks</th>
                  <th className="py-2 px-2 text-right">CTR</th>
                  <th className="py-2 px-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map((campaign) => {
                  const metrics = metricsByCampaign[campaign.id] || { impressions: 0, clicks: 0, ctr: 0, byPlacement: {} };
                  return (
                    <tr key={campaign.id} className="border-b border-[var(--border-color)]">
                      <td className="py-3 px-2">
                        <p className="font-semibold">{campaign.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{campaign.sponsorName || 'Sin sponsor'}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs border ${statusBadgeClass[campaign.status]}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--text-secondary)]">
                        <div className="space-y-1">
                          {(campaign.placements || []).length === 0 ? (
                            <p>-</p>
                          ) : (
                            campaign.placements.map((placementId) => (
                              <p key={`${campaign.id}_${placementId}`}>
                                {placementLabelById[placementId] || placementId}
                                <span className="ml-1 text-xs text-[var(--text-secondary)]">
                                  ({metrics.byPlacement[placementId]?.impressions || 0}/{metrics.byPlacement[placementId]?.clicks || 0})
                                </span>
                              </p>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono">{metrics.impressions}</td>
                      <td className="py-3 px-2 text-right font-mono">{metrics.clicks}</td>
                      <td className="py-3 px-2 text-right font-mono">{metrics.ctr}%</td>
                      <td className="py-3 px-2">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(campaign)}
                            className="px-3 py-1 text-xs rounded-md border border-[var(--border-color)] bg-[var(--background-light)]"
                          >
                            Editar
                          </button>
                          {campaign.status !== 'archived' ? (
                            <button
                              onClick={() => handleArchive(campaign)}
                              className="px-3 py-1 text-xs rounded-md bg-red-600 text-white"
                            >
                              Archivar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdsManagement;
