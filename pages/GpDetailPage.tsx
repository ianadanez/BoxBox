import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { GrandPrix, OfficialResult } from '../types';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import GpWeekendAgenda, { getNextGpSession } from '../components/common/GpWeekendAgenda';
import LoadingSpinner from '../components/common/LoadingSpinner';

const formatRaceDate = (raceIso: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(raceIso));

const GpDetailPage: React.FC = () => {
  const { gpId } = useParams<{ gpId: string }>();
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<GrandPrix[]>([]);
  const [results, setResults] = useState<OfficialResult[]>([]);
  const [loading, setLoading] = useState(true);

  const numericGpId = Number(gpId);

  useEffect(() => {
    const loadGp = async () => {
      setLoading(true);
      try {
        const [scheduleData, resultsData] = await Promise.all([
          db.getSchedule(),
          db.getOfficialResults(),
        ]);
        setSchedule(scheduleData);
        setResults(resultsData);
      } finally {
        setLoading(false);
      }
    };

    loadGp();
  }, []);

  const gp = useMemo(
    () => schedule.find((entry) => entry.id === numericGpId) || null,
    [numericGpId, schedule]
  );

  if (!Number.isFinite(numericGpId)) {
    return <Navigate to="/calendar" replace />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!gp) {
    return <Navigate to="/calendar" replace />;
  }

  const nextSession = getNextGpSession(gp);
  const predictionOpen = new Date(gp.events.quali).getTime() > Date.now();
  const hasResult = results.some((result) => result.gpId === gp.id);

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        <Link
          to="/"
          className="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--background-light)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
        >
          Volver
        </Link>

        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--background-medium)] p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--background-light)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              GP {gp.id}
            </span>
            {gp.hasSprint && (
              <span className="rounded-full border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                Sprint
              </span>
            )}
          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
            {gp.name}
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {gp.track} · {gp.country}
          </p>
          <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
            {formatRaceDate(gp.events.race)}
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--accent-red)]/50 bg-[var(--accent-red)]/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-red)]">
              {nextSession ? 'Sigue' : 'Estado'}
            </p>
            <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">
              {nextSession ? nextSession.label : 'Fin de semana completado'}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent-red)]">Horarios</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Sesiones del GP</h2>
          </div>
          <GpWeekendAgenda gp={gp} />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          {predictionOpen ? (
            <Link
              to={user ? `/predict/${gp.id}` : '/login'}
              className="rounded-full bg-[var(--accent-red)] px-5 py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {user ? 'Completar predicción' : 'Iniciar sesión para predecir'}
            </Link>
          ) : (
            <Link
              to={hasResult && user ? `/results/${user.id}/${gp.id}` : '/leaderboard'}
              className="rounded-full bg-[var(--accent-red)] px-5 py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {hasResult ? 'Ver resultados' : 'Ver temporada'}
            </Link>
          )}
          <Link
            to="/calendar"
            className="rounded-full border border-[var(--border-color)] bg-[var(--background-light)] px-5 py-3 text-center text-sm font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
          >
            Calendario completo
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GpDetailPage;
