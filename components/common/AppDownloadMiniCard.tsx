import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { detectViewerPlatform, trackDownloadEvent } from '../../services/downloadTracking';

const AppDownloadMiniCard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const viewerPlatform = useMemo(() => detectViewerPlatform(), []);
  const pagePath = `${location.pathname}${location.search}${location.hash}`;

  const handleClick = () => {
    void trackDownloadEvent({
      eventName: 'banner_cta_click',
      targetPlatform: viewerPlatform === 'ios' ? 'ios' : 'android',
      viewerPlatform,
      source: 'home_download_mini_card',
      pagePath,
      userId: user?.id ?? null,
    });
  };

  return (
    <div className="bg-[var(--background-medium)] rounded-xl border border-[var(--border-color)] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1">App móvil</p>
      <h3 className="text-lg font-bold text-white mb-2">BoxBox en tu teléfono 📲</h3>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
        {viewerPlatform === 'android'
          ? 'Instalala en Android con guía paso a paso.'
          : 'Android disponible ahora. iOS próximamente.'}
      </p>
      <Link
        to="/app-download"
        onClick={handleClick}
        className="inline-block px-3 py-2 rounded-lg bg-[var(--accent-blue)] text-black text-sm font-semibold hover:opacity-85 transition-opacity"
      >
        Ver instalación
      </Link>
    </div>
  );
};

export default AppDownloadMiniCard;
