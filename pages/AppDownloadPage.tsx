import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  detectViewerPlatform,
  getAndroidApkUrl,
  trackDownloadEvent,
} from '../services/downloadTracking';

const AppDownloadPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const viewerPlatform = useMemo(() => detectViewerPlatform(), []);
  const apkUrl = getAndroidApkUrl();
  const pagePath = `${location.pathname}${location.search}${location.hash}`;

  const qrUrl = useMemo(() => {
    if (!apkUrl) return '';
    return `https://quickchart.io/qr?text=${encodeURIComponent(apkUrl)}&size=220`;
  }, [apkUrl]);

  const handleDownloadClick = () => {
    if (!apkUrl) return;
    void trackDownloadEvent({
      eventName: 'tutorial_android_download_click',
      targetPlatform: 'android',
      viewerPlatform,
      source: 'app_download_page',
      pagePath,
      userId: user?.id ?? null,
    });
    window.open(apkUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    if (!apkUrl) return;
    try {
      await navigator.clipboard.writeText(apkUrl);
      setCopyStatus('ok');
      void trackDownloadEvent({
        eventName: 'tutorial_copy_link_click',
        targetPlatform: 'android',
        viewerPlatform,
        source: 'app_download_page',
        pagePath,
        userId: user?.id ?? null,
      });
    } catch {
      setCopyStatus('error');
    }
    window.setTimeout(() => setCopyStatus('idle'), 2200);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="bg-[var(--background-medium)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)] mb-2">App móvil</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Instalar BoxBox en Android 📲</h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          La app Android ya está disponible por descarga directa (APK). Por ahora no está publicada en Play
          Store porque estamos cerrando el proceso de publicación y revisión final.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6">
          <section className="rounded-xl border border-[var(--border-color)] bg-[var(--background-light)] p-5">
            <h2 className="text-xl font-semibold text-white mb-3">Cómo instalar (2 minutos)</h2>
            <ol className="space-y-3 text-sm md:text-base text-[var(--text-primary)] list-decimal list-inside">
              <li>Descargá el archivo APK desde el botón de abajo.</li>
              <li>Si Android lo pide, habilitá la instalación desde origen externo para tu navegador.</li>
              <li>Abrí el APK descargado y confirmá la instalación.</li>
              <li>Entrá a BoxBox y logueate con tu cuenta habitual.</li>
            </ol>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={!apkUrl}
                className="px-4 py-2 rounded-lg bg-[#dc2626] hover:bg-[#ef4444] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                Descargar APK
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!apkUrl}
                className="px-4 py-2 rounded-lg border border-[var(--border-color)] hover:border-[var(--text-secondary)] text-[var(--text-primary)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                Copiar enlace
              </button>
            </div>
            {copyStatus === 'ok' && <p className="mt-3 text-sm text-green-300">Enlace copiado.</p>}
            {copyStatus === 'error' && (
              <p className="mt-3 text-sm text-yellow-300">No se pudo copiar automáticamente.</p>
            )}
          </section>

          <section className="rounded-xl border border-[var(--border-color)] bg-[var(--background-light)] p-5">
            <h2 className="text-xl font-semibold text-white mb-3">Descargar desde PC</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              Escaneá este QR con el celular Android para abrir la descarga directamente.
            </p>
            {apkUrl ? (
              <div className="bg-white p-3 rounded-lg inline-block">
                <img src={qrUrl} alt="QR de descarga de BoxBox Android" className="w-44 h-44 md:w-52 md:h-52" />
              </div>
            ) : (
              <p className="text-sm text-yellow-300">Aún no hay un enlace de descarga configurado.</p>
            )}
          </section>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[var(--background-light)] p-5">
          <h2 className="text-xl font-semibold text-white mb-2">Estado de iOS</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            La versión para iPhone está en preparación y se publicará cuando completemos la salida oficial en
            App Store/TestFlight. Mientras tanto, la experiencia completa está disponible en web y Android.
          </p>
        </div>

        <div className="mt-6">
          <Link to="/" className="text-sm text-[var(--accent-blue)] hover:underline">
            ← Volver al inicio
          </Link>
        </div>

        {viewerPlatform === 'ios' && (
          <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            Estás navegando desde iOS. La descarga APK solo funciona en Android.
          </div>
        )}
      </div>
    </div>
  );
};

export default AppDownloadPage;
