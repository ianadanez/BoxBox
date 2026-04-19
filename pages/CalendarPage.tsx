import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GrandPrix, OfficialResult } from '../types';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import GpWeekendAgenda from '../components/common/GpWeekendAgenda';
import LoadingSpinner from '../components/common/LoadingSpinner';

const formatDateRange = (raceIso: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(raceIso));

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<GrandPrix[]>([]);
  const [results, setResults] = useState<OfficialResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCalendar = async () => {
      setLoading(true);
      try {
        const [scheduleData, resultsData] = await Promise.all([
          db.getSchedule(),
          db.getOfficialResults(),
        ]);
        setSchedule(scheduleData.sort((a, b) => a.id - b.id));
        setResults(resultsData);
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
  }, []);

  const { upcomingGps, completedGps } = useMemo(() => {
    const now = Date.now();
    const next: GrandPrix[] = [];
    const completed: GrandPrix[] = [];

    schedule.forEach((gp) => {
      if (new Date(gp.events.race).getTime() >= now) {
        next.push(gp);
      } else {
        completed.push(gp);
      }
    });

    return {
      upcomingGps: next,
      completedGps: completed.reverse(),
    };
  }, [schedule]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="space-y-8">
        <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--background-medium)] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)]">Temporada activa</p>
              <h1 className="mt-2 text-3xl font-bold f1-red-text sm:text-4xl">Calendario completo</h1>
              <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
                Todas las carreras y sesiones en tu horario local. El juego sigue siendo el centro, pero ahora tenés el contexto completo del fin de semana.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-light)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <p>Próximas carreras: <span className="font-semibold text-[var(--text-primary)]">{upcomingGps.length}</span></p>
              <p>Resultados publicados: <span className="font-semibold text-[var(--text-primary)]">{results.length}</span></p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Próximas carreras</h2>
              <p className="text-sm text-[var(--text-secondary)]">Lo importante de las próximas semanas, sin salir del calendario.</p>
            </div>
          </div>

          <div className="space-y-4">
            {upcomingGps.map((gp, index) => {
              const predictionOpen = new Date(gp.events.quali).getTime() > Date.now();
              const hasPublishedResult = results.some((result) => result.gpId === gp.id);

              return (
                <article
                  key={gp.id}
                  className="rounded-3xl border border-[var(--border-color)] bg-[var(--background-medium)] p-5 shadow-lg shadow-black/10"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-[var(--background-light)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          GP {gp.id}
                        </span>
                        {index === 0 && (
                          <span className="rounded-full bg-[var(--accent-red)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
                            Próximo
                          </span>
                        )}
                        {gp.hasSprint && (
                          <span className="rounded-full border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                            Sprint
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">{gp.name}</h3>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {gp.track} · {gp.country} · {formatDateRange(gp.events.race)}
                      </p>

                      <div className="mt-5">
                        <GpWeekendAgenda gp={gp} />
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-64">
                      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-light)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Acción</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {predictionOpen
                            ? 'La predicción sigue abierta.'
                            : hasPublishedResult
                            ? 'La fecha ya tiene resultados cargados.'
                            : 'La predicción ya cerró para este GP.'}
                        </p>
                      </div>

                      {predictionOpen ? (
                        <Link
                          to={user ? `/predict/${gp.id}` : '/login'}
                          className="rounded-2xl bg-[var(--accent-red)] px-4 py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
                        >
                          {user ? 'Completar predicción' : 'Iniciar sesión para predecir'}
                        </Link>
                      ) : (
                        <Link
                          to="/leaderboard"
                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-light)] px-4 py-3 text-center text-sm font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
                        >
                          Ver tabla y resultados
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Carreras ya corridas</h2>
            <p className="text-sm text-[var(--text-secondary)]">Historial rápido de la temporada para volver sobre fechas ya disputadas.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {completedGps.map((gp) => {
              const hasPublishedResult = results.some((result) => result.gpId === gp.id);
              return (
                <article
                  key={gp.id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--background-medium)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">{gp.name}</h3>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {gp.track} · {gp.country}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {formatDateRange(gp.events.race)}
                      </p>
                    </div>
                    {gp.hasSprint && (
                      <span className="rounded-full border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                        Sprint
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <GpWeekendAgenda gp={gp} compact />
                  </div>

                  <div className="mt-4">
                    <Link
                      to="/leaderboard"
                      className="inline-flex rounded-xl border border-[var(--border-color)] bg-[var(--background-light)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
                    >
                      {hasPublishedResult ? 'Ver tabla y standings' : 'Ver temporada'}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CalendarPage;
