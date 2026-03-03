import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';

const ANNOUNCEMENT_ID = 'web_2026_constructors_launch_v1';

const UserAnnouncementModal: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      return;
    }
    const alreadySeen = Boolean(user.announcementsSeen?.[ANNOUNCEMENT_ID]);
    setIsOpen(!alreadySeen);
  }, [user]);

  const handleClose = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    setError(null);

    const updatedUser: User = {
      ...user,
      announcementsSeen: {
        ...(user.announcementsSeen ?? {}),
        [ANNOUNCEMENT_ID]: new Date().toISOString(),
      },
    };

    try {
      await updateUser(updatedUser);
      setIsOpen(false);
    } catch (err) {
      console.error('No se pudo guardar el anuncio como visto', err);
      setError('No pudimos guardar este cambio. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[var(--background-card)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-semibold tracking-wide mb-3">
          <span>🏁</span>
          <span>Nueva mecánica</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">¡Llegó el Campeonato de Constructores! 🏆</h2>
        <p className="text-[var(--text-secondary)] mb-4">
          Ahora también competís con tu escudería favorita, no solo en la tabla individual.
        </p>

        <div className="rounded-xl border border-[var(--border-primary)] bg-black/20 p-4 mb-4">
          <p className="text-sm text-[var(--text-secondary)] mb-2">Cómo suma tu equipo:</p>
          <p className="text-white text-lg font-bold">Cada 10 pts tuyos = 1 pt para tu escudería ⚡</p>
          <p className="text-sm text-[var(--text-secondary)] mt-2">Ejemplo: si hacés 47 puntos, aportás 4 a constructores.</p>
        </div>

        <div className="space-y-2 text-sm text-[var(--text-primary)]">
          <p>✅ Se cuentan solo tus puntos de predicción.</p>
          <p>✅ Podés ver la tabla de constructores en el leaderboard.</p>
          <p>✅ Tu escudería favorita se gestiona desde tu perfil.</p>
        </div>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-5 py-2 rounded-lg bg-[#dc2626] hover:bg-[#ef4444] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Vamos'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAnnouncementModal;
