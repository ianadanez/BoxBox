import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOptionalAuth } from '../../contexts/AuthContext';
import {
  detectViewerPlatform,
  getAndroidApkUrl,
  trackDownloadEvent,
} from '../../services/downloadTracking';

const BANNER_VERSION = 'v1';
const DISMISS_KEY = `boxbox_download_banner_dismissed_${BANNER_VERSION}`;

const AppDownloadBanner: React.FC = () => {
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  });

  const viewerPlatform = useMemo(() => detectViewerPlatform(), []);
  const ANDROID_APK_URL = getAndroidApkUrl();
  const hasAndroidDownload = Boolean(ANDROID_APK_URL);
  const pagePath = `${location.pathname}${location.search}${location.hash}`;

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1');
    }
    void trackDownloadEvent({
      eventName: 'banner_close',
      targetPlatform: viewerPlatform === 'ios' ? 'ios' : 'android',
      viewerPlatform,
      source: 'global_download_banner',
      pagePath,
      userId,
    });
  };

  const handleCtaClick = () => {
    void trackDownloadEvent({
      eventName: 'banner_cta_click',
      targetPlatform: viewerPlatform === 'ios' ? 'ios' : 'android',
      viewerPlatform,
      source: 'global_download_banner',
      pagePath,
      userId,
    });
    navigate('/app-download');
  };

  const getTitle = () => {
    if (viewerPlatform === 'android') return '📲 BoxBox App Android ya está disponible';
    if (viewerPlatform === 'ios') return '🍏 App iOS próximamente';
    return '💻 También tenemos app Android';
  };

  const getDescription = () => {
    if (viewerPlatform === 'android') {
      return hasAndroidDownload
        ? 'Descargá el APK oficial y empezá a jugar desde el celular.'
        : 'Estamos terminando de publicar el link de descarga del APK.';
    }
    if (viewerPlatform === 'ios') {
      return 'La versión para iPhone está en camino. Mientras tanto podés seguir jugando en la web.';
    }
    return hasAndroidDownload
      ? 'Escaneá o abrí este link desde un Android para instalar la app. iOS estará disponible más adelante.'
      : 'La app Android sale en breve. iOS estará disponible más adelante.';
  };

  return (
    <section className="mx-auto mt-4 w-full max-w-6xl px-4">
      <div className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-[#18090a] via-[#1f0f10] to-[#100708] p-4 md:p-5">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40"
          aria-label="Cerrar anuncio de app"
        >
          ✕
        </button>

        <div className="pr-10">
          <p className="text-xs uppercase tracking-[0.14em] text-red-200/80 mb-1">Novedad</p>
          <h3 className="text-lg md:text-xl font-bold text-white">{getTitle()}</h3>
          <p className="text-sm md:text-base text-red-50/85 mt-1">{getDescription()}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {hasAndroidDownload && viewerPlatform !== 'ios' && (
              <button
                type="button"
                onClick={handleCtaClick}
                className="px-4 py-2 rounded-lg bg-[#dc2626] hover:bg-[#ef4444] text-white text-sm font-semibold transition-colors"
              >
                Ver cómo instalar
              </button>
            )}
            {viewerPlatform === 'ios' && (
              <button
                type="button"
                onClick={handleCtaClick}
                className="px-3 py-2 rounded-lg border border-white/25 text-sm text-white/85 hover:border-white/40 hover:text-white transition-colors"
              >
                Ver estado de iOS
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppDownloadBanner;
