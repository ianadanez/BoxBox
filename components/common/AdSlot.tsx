import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../services/db';
import { AdCampaign, AdImageOrientation, AdPlacement } from '../../types';
import {
  detectOrientationFromSize,
  getAdImageBoxSize,
  getOrCreateAdSessionId,
  pickCampaignForPlacement,
} from '../../services/ads';
import { useAuth } from '../../contexts/AuthContext';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
  showLabel?: boolean;
}

const ensureAbsoluteUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '', showLabel = true }) => {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [detectedOrientation, setDetectedOrientation] = useState<AdImageOrientation>('horizontal');
  const trackedImpression = useRef(false);
  const sessionId = useMemo(() => getOrCreateAdSessionId(), []);
  const pagePath = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    return `${window.location.pathname}${window.location.search}`;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const activeCampaigns = await db.getActiveAdCampaigns();
        if (!isMounted) return;
        setCampaign(pickCampaignForPlacement(activeCampaigns, placement));
      } catch (error) {
        console.error('No se pudieron cargar campañas publicitarias', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [placement]);

  useEffect(() => {
    if (!campaign || trackedImpression.current) return;
    trackedImpression.current = true;
    db.trackAdEvent({
      campaignId: campaign.id,
      placement,
      eventType: 'impression',
      pagePath,
      sessionId,
      targetUrl: campaign.targetUrl,
      userId: user?.id ?? null,
    }).catch((error) => {
      console.error('No se pudo registrar impresión de banner', error);
    });
  }, [campaign, pagePath, placement, sessionId, user?.id]);

  useEffect(() => {
    if (!campaign?.imageUrl) {
      setDetectedOrientation('horizontal');
      return;
    }
    if (campaign.imageOrientationMode && campaign.imageOrientationMode !== 'auto') {
      setDetectedOrientation(campaign.imageOrientationMode);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setDetectedOrientation(detectOrientationFromSize(image.naturalWidth, image.naturalHeight));
    };
    image.onerror = () => {
      if (cancelled) return;
      setDetectedOrientation('horizontal');
    };
    image.src = campaign.imageUrl;
    return () => {
      cancelled = true;
    };
  }, [campaign?.id, campaign?.imageUrl, campaign?.imageOrientationMode]);

  const handleClick = () => {
    if (!campaign) return;
    db.trackAdEvent({
      campaignId: campaign.id,
      placement,
      eventType: 'click',
      pagePath,
      sessionId,
      targetUrl: campaign.targetUrl,
      userId: user?.id ?? null,
    }).catch((error) => {
      console.error('No se pudo registrar click de banner', error);
    });
  };

  if (loading) {
    return (
      <div className={`bg-[var(--background-medium)] border border-[var(--border-color)] rounded-lg min-h-[180px] animate-pulse ${className}`} />
    );
  }

  if (!campaign) {
    return (
      <div className={`bg-[var(--background-medium)] border border-dashed border-[var(--border-color)] rounded-lg min-h-[180px] px-4 py-6 text-center ${className}`}>
        {showLabel && (
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] mb-2">
            Publicidad
          </p>
        )}
        <p className="text-[var(--text-secondary)] text-sm">
          Este espacio publicitario está disponible.
        </p>
      </div>
    );
  }

  const url = ensureAbsoluteUrl(campaign.targetUrl);
  const imageUrl = campaign.imageUrl?.trim();
  const imageFit = campaign.imageFit === 'contain' ? 'contain' : 'cover';
  const focalX = Number.isFinite(campaign.focalPointX) ? Number(campaign.focalPointX) : 50;
  const focalY = Number.isFinite(campaign.focalPointY) ? Number(campaign.focalPointY) : 50;
  const imagePosition = `${Math.max(0, Math.min(100, focalX))}% ${Math.max(0, Math.min(100, focalY))}%`;
  const orientation =
    campaign.imageOrientationMode && campaign.imageOrientationMode !== 'auto'
      ? campaign.imageOrientationMode
      : detectedOrientation;
  const boxSize = getAdImageBoxSize({
    orientation,
    desktopScale: campaign.imageScaleDesktop,
    mobileScale: campaign.imageScaleMobile,
  });

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`block bg-[var(--background-medium)] border border-[var(--border-color)] rounded-lg overflow-hidden hover:border-[var(--accent-red)] transition-all ${className}`}
    >
      {showLabel && (
        <div className="px-4 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
            Publicidad
          </p>
        </div>
      )}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={campaign.title}
            className="w-full h-[var(--ad-mobile-h)] sm:w-[var(--ad-desktop-w)] sm:h-[var(--ad-desktop-h)] object-cover rounded-md border border-[var(--border-color)]"
            style={{
              objectFit: imageFit,
              objectPosition: imagePosition,
              backgroundColor: '#0f1115',
              ['--ad-mobile-h' as any]: `${boxSize.mobileHeight}px`,
              ['--ad-desktop-w' as any]: `${boxSize.desktopWidth}px`,
              ['--ad-desktop-h' as any]: `${boxSize.desktopHeight}px`,
            }}
            loading="lazy"
          />
        ) : null}
        <div className="min-w-0">
          {campaign.sponsorName ? (
            <p className="text-xs uppercase tracking-wide text-[var(--accent-blue)] font-semibold mb-1">
              {campaign.sponsorName}
            </p>
          ) : null}
          <h4 className="text-base font-bold text-[var(--text-primary)] leading-tight">{campaign.title}</h4>
          {campaign.description ? (
            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{campaign.description}</p>
          ) : null}
          {campaign.ctaText ? (
            <span className="inline-block mt-3 text-sm font-semibold text-[var(--accent-red)]">{campaign.ctaText} →</span>
          ) : null}
        </div>
      </div>
    </a>
  );
};

export default AdSlot;
