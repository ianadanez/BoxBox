import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConstructorStanding, Driver, GrandPrix, OfficialResult, SeasonTotal, Team } from '../types';
import { db } from '../services/db';
import Countdown from '../components/common/Countdown';
import Avatar from '../components/common/Avatar';
import AdSlot from '../components/common/AdSlot';
import AppDownloadMiniCard from '../components/common/AppDownloadMiniCard';
import GpWeekendAgenda, { getNextGpSession } from '../components/common/GpWeekendAgenda';
import { useAuth } from '../contexts/AuthContext';

const getTeamColor = (driverId: string, drivers: Driver[], teams: Team[]) => {
  const driver = drivers.find((item) => item.id === driverId);
  const team = teams.find((item) => item.id === driver?.teamId);
  return team?.color || 'bg-gray-500';
};

const normalizeTeamColor = (value?: string) => {
  if (!value) return '#9aa0a6';
  if (value.startsWith('bg-[') && value.endsWith(']')) {
    return value.slice(4, -1);
  }
  return value;
};

const formatRaceDate = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(isoDate));

const formatShortRaceDate = (isoDate: string) => {
  const parts = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
  }).formatToParts(new Date(isoDate));
  const day = parts.find((part) => part.type === 'day')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  return `${day} ${month}`.trim().replace('.', '');
};

const ResultCard: React.FC<{ title: string; driverId?: string; drivers: Driver[]; teams: Team[] }> = ({ title, driverId, drivers, teams }) => {
  if (!drivers.length || !teams.length) return null;
  const driver = drivers.find((item) => item.id === driverId);
  if (!driverId || !driver) {
    return (
      <div className="flex items-center space-x-3 rounded-lg bg-[var(--background-light)] p-4 animate-pulse">
        <div className="h-10 w-1.5 rounded-full bg-[var(--border-color)]" />
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>
          <div className="mt-1 h-5 w-24 rounded bg-[var(--background-light)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 rounded-lg bg-[var(--background-light)] p-4">
      <div className={`h-10 w-1.5 rounded-full ${getTeamColor(driver.id, drivers, teams)}`} />
      <div>
        <p className="text-sm text-[var(--text-secondary)]">{title}</p>
        <p className="font-bold text-[var(--text-primary)]">{driver.name}</p>
      </div>
    </div>
  );
};

const PodiumCard: React.FC<{ position: number; driverId?: string; drivers: Driver[]; teams: Team[] }> = ({ position, driverId, drivers, teams }) => {
  const positionStyles: Record<number, string> = {
    1: 'border-[var(--accent-red)]',
    2: 'border-gray-400',
    3: 'border-yellow-600',
  };

  if (!drivers.length || !teams.length) {
    return (
      <div className={`rounded-lg border-l-4 bg-[var(--background-light)] p-4 ${positionStyles[position]} animate-pulse`}>
        <div className="mb-2 h-6 w-8 rounded bg-[var(--border-color)]" />
        <div className="mb-1 h-4 w-28 rounded bg-[var(--border-color)]" />
        <div className="h-3 w-20 rounded bg-[var(--border-color)]" />
      </div>
    );
  }

  const driver = drivers.find((item) => item.id === driverId);
  if (!driverId || !driver) return null;

  return (
    <div className={`rounded-lg border-l-4 bg-[var(--background-light)] p-4 ${positionStyles[position]}`}>
      <p className="text-lg font-bold text-[var(--text-primary)]">P{position}</p>
      <p className="text-md font-medium text-[var(--text-primary)]">{driver.name}</p>
      <p className="text-xs text-[var(--text-secondary)]">{teams.find((team) => team.id === driver.teamId)?.name}</p>
    </div>
  );
};

type HomeData = {
  lastGp: GrandPrix | null;
  nextGp: GrandPrix | null;
  upcomingGps: GrandPrix[];
  lastResult: OfficialResult | null;
  leaderboard: SeasonTotal[];
  constructors: ConstructorStanding[];
  drivers: Driver[];
  teams: Team[];
};

const HomePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<HomeData>({
    lastGp: null,
    nextGp: null,
    upcomingGps: [],
    lastResult: null,
    leaderboard: [],
    constructors: [],
    drivers: [],
    teams: [],
  });
  const [loading, setLoading] = useState(true);

  const TOP_LEADERBOARD_LIMIT = 10;
  const TOP_CONSTRUCTORS_LIMIT = 5;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [schedule, officialResults, driversData, teamsData, constructorsData] = await Promise.all([
          db.getSchedule(),
          db.getOfficialResults(),
          db.getDrivers(),
          db.getTeams(),
          db.getPublicConstructorsLeaderboardForActiveSeason(),
        ]);

        let seasonTotals: SeasonTotal[] = [];
        if (user) {
          seasonTotals = await db.calculateSeasonTotals();
        } else {
          const publicBoard = await db.getPublicLeaderboardForActiveSeason();
          seasonTotals = publicBoard.map((entry) => ({
            userId: entry.userId || '',
            userUsername: entry.userUsername,
            userAvatar: entry.userAvatar,
            totalPoints: entry.totalPoints,
            details: {
              exactP1: entry.details?.exactP1 ?? 0,
              exactPole: entry.details?.exactPole ?? 0,
              exactFastestLap: entry.details?.exactFastestLap ?? 0,
            },
          }));
        }

        const now = new Date();
        const finishedGpsWithResult = schedule.filter(
          (gp) => new Date(gp.events.race) < now && officialResults.some((result) => result.gpId === gp.id)
        );
        const upcomingGps = schedule
          .filter((gp) => new Date(gp.events.race) >= now)
          .sort((a, b) => new Date(a.events.race).getTime() - new Date(b.events.race).getTime());

        const lastFinishedGp = finishedGpsWithResult.pop() || null;

        setData({
          drivers: driversData,
          teams: teamsData,
          constructors: constructorsData,
          leaderboard: seasonTotals,
          lastGp: lastFinishedGp,
          lastResult: lastFinishedGp ? officialResults.find((result) => result.gpId === lastFinishedGp.id) || null : null,
          nextGp: upcomingGps[0] || null,
          upcomingGps: upcomingGps.slice(1, 4),
        });
      } catch (error) {
        console.error('Failed to fetch homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const topLeaderboard = data.leaderboard.slice(0, TOP_LEADERBOARD_LIMIT);
  const topConstructors = data.constructors.slice(0, TOP_CONSTRUCTORS_LIMIT);

  const nextGpMeta = useMemo(() => {
    if (!data.nextGp) return null;

    const nextSession = getNextGpSession(data.nextGp);
    const predictionClosesAt = new Date(data.nextGp.events.quali).getTime();
    const now = Date.now();
    const predictionOpen = now < predictionClosesAt;

    return {
      nextSession,
      predictionOpen,
      primaryAction: predictionOpen
        ? {
            to: user ? `/predict/${data.nextGp.id}` : '/login',
            label: user ? 'Completar predicción' : 'Iniciar sesión para predecir',
          }
        : {
            to: '/leaderboard',
            label: 'Seguir la temporada',
          },
    };
  }, [data.nextGp, user]);

  if (authLoading || loading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="space-y-8">
        {data.nextGp && nextGpMeta && (
          <section className="overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--background-medium)] shadow-2xl shadow-black/20">
            <div className="grid grid-cols-1 xl:grid-cols-12">
              <div className="xl:col-span-8 border-b border-[var(--border-color)] bg-[linear-gradient(135deg,rgba(230,36,41,0.14),rgba(230,36,41,0.04))] p-5 lg:p-6 xl:border-b-0 xl:border-r">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[var(--accent-red)] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-white">
                    Próximo GP
                  </span>
                  {data.nextGp.hasSprint && (
                    <span className="rounded-full border border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-blue)]">
                      Sprint
                    </span>
                  )}
                  {nextGpMeta.nextSession && (
                    <span className="rounded-full bg-[var(--background-light)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      Sigue: {nextGpMeta.nextSession.label}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <h1 className="max-w-xl text-3xl font-bold leading-[0.95] text-[var(--text-primary)] sm:text-4xl xl:text-[3.35rem]">
                      {data.nextGp.name}
                    </h1>
                    <p className="mt-2 text-sm uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                      {data.nextGp.track} · {data.nextGp.country}
                    </p>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
                      {nextGpMeta.predictionOpen
                        ? `La predicción sigue abierta hasta la clasificación. Después, BoxBox te sigue mostrando el ritmo del fin de semana y lo que viene.`
                        : `La predicción ya cerró, pero seguís teniendo el contexto del fin de semana y acceso al calendario completo.`}
                    </p>
                  </div>

                  <div className="w-full shrink-0 rounded-2xl border border-[var(--border-color)] bg-[var(--background-dark)]/65 p-4 text-center lg:w-[280px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                      {nextGpMeta.nextSession ? `Cuenta regresiva a ${nextGpMeta.nextSession.label}` : 'Cuenta regresiva a la carrera'}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{formatRaceDate((nextGpMeta.nextSession?.time || data.nextGp.events.race))}</p>
                    <div className="mt-4">
                      <Countdown
                        targetDate={nextGpMeta.nextSession?.time || data.nextGp.events.race}
                        compact
                      />
                    </div>
                    <Link
                      to="/calendar"
                      className="mt-4 inline-flex items-center justify-center rounded-full border border-[var(--border-color)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
                    >
                      Ver calendario completo
                    </Link>
                  </div>
                </div>

                <div className="mt-6">
                  <GpWeekendAgenda gp={data.nextGp} />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={nextGpMeta.primaryAction.to}
                    className="rounded-full bg-[var(--accent-red)] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  >
                    {nextGpMeta.primaryAction.label}
                  </Link>
                  <Link
                    to="/calendar"
                    className="rounded-full border border-[var(--border-color)] bg-[var(--background-light)] px-6 py-3 text-sm font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-red)] hover:text-[var(--accent-red)]"
                  >
                    Explorar calendario
                  </Link>
                </div>
              </div>

              <div className="xl:col-span-4 p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">Lo que viene</p>
                    <h2 className="mt-2 text-[2rem] font-bold leading-none text-[var(--text-primary)]">Próximas fechas</h2>
                  </div>
                  <Link to="/calendar" className="text-sm font-semibold text-[var(--accent-blue)] hover:opacity-80 transition-opacity">
                    Calendario
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {data.upcomingGps.map((gp) => (
                    <Link
                      key={gp.id}
                      to="/calendar"
                      className="block rounded-2xl border border-[var(--border-color)] bg-[var(--background-light)] p-4 transition-colors hover:border-[var(--accent-red)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            GP {gp.id}{gp.hasSprint ? ' · Sprint' : ''}
                          </p>
                          <h3 className="mt-1 pr-3 text-lg font-bold leading-tight text-[var(--text-primary)]">
                            {gp.name}
                          </h3>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {gp.country} · {formatRaceDate(gp.events.race)}
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-[var(--background-dark)] px-3 py-1 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          {formatShortRaceDate(gp.events.race)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="space-y-8 xl:col-span-4">
            {data.lastGp && data.lastResult && (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background-medium)] p-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-red)]">Último resultado</p>
                  <h2 className="mt-2 text-[1.75rem] font-bold leading-tight text-[var(--text-primary)]">{data.lastGp.name}</h2>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Carrera</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {data.lastResult.racePodium?.map((driverId, index) => (
                      <PodiumCard key={index} position={index + 1} driverId={driverId} drivers={data.drivers} teams={data.teams} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ResultCard title="Pole Position" driverId={data.lastResult.pole} drivers={data.drivers} teams={data.teams} />
                    <ResultCard title="Vuelta Rápida" driverId={data.lastResult.fastestLap} drivers={data.drivers} teams={data.teams} />
                    <ResultCard title="Piloto del Día" driverId={data.lastResult.driverOfTheDay} drivers={data.drivers} teams={data.teams} />
                  </div>
                  {data.lastGp.hasSprint && data.lastResult.sprintPodium && (
                    <>
                      <h3 className="pt-4 text-lg font-semibold text-[var(--text-primary)]">Sprint</h3>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {data.lastResult.sprintPodium.map((driverId, index) => (
                          <PodiumCard
                            key={`sprint-${index}`}
                            position={index + 1}
                            driverId={driverId}
                            drivers={data.drivers}
                            teams={data.teams}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background-medium)] p-6 xl:col-span-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-red)]">Competencia</p>
              <h2 className="mt-2 text-[1.75rem] font-bold leading-tight text-[var(--text-primary)]">Tabla general de la temporada</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Top 10 actual para entrar rápido a la pelea.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b-2 border-[var(--border-color)]">
                  <tr>
                    <th className="p-3 text-center text-sm font-semibold tracking-wide">Pos</th>
                    <th className="p-3 text-sm font-semibold tracking-wide">Usuario</th>
                    <th className="p-3 text-right text-sm font-semibold tracking-wide">Puntos</th>
                    <th className="hidden p-3 text-center text-sm font-semibold tracking-wide md:table-cell">P1</th>
                    <th className="hidden p-3 text-center text-sm font-semibold tracking-wide md:table-cell">Pole</th>
                  </tr>
                </thead>
                <tbody>
                  {topLeaderboard.map((score, index) => {
                    const isHighlighted = Boolean(user && score.userId === user.id);
                    return (
                      <tr key={score.userId} className={`border-b border-[var(--border-color)] ${isHighlighted ? 'bg-[var(--accent-red)]/15' : ''}`}>
                        <td className={`p-3 text-center text-lg font-bold text-[var(--text-secondary)] ${isHighlighted ? 'border-l-4 border-[var(--accent-red)]' : ''}`}>
                          {index + 1}
                        </td>
                        <td className="p-2 font-medium">
                          <Link to={`/profile/${score.userId}`} className="group flex items-center space-x-3">
                            <Avatar avatar={score.userAvatar} className="h-10 w-10" />
                            <span className="transition-colors group-hover:text-[var(--accent-red)]">
                              {score.userUsername}
                              {isHighlighted && <span className="ml-2 text-xs font-semibold text-[var(--accent-red)]">· Tú</span>}
                            </span>
                          </Link>
                        </td>
                        <td className="p-3 text-right font-mono text-lg font-bold text-[var(--accent-blue)]">{score.totalPoints}</td>
                        <td className="hidden p-3 text-center font-mono text-gray-400 md:table-cell">{score.details.exactP1}</td>
                        <td className="hidden p-3 text-center font-mono text-gray-400 md:table-cell">{score.details.exactPole}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Link to="/leaderboard" className="rounded-md bg-[var(--accent-blue)] px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-80">
                Ver tabla completa
              </Link>
            </div>

            <div className="mt-8">
              <AdSlot placement="home_leaderboard_inline" />
            </div>
          </div>

          <div className="space-y-8 xl:col-span-3">
            {topConstructors.length > 0 && (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background-medium)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-red)]">Equipos</p>
                    <h3 className="mt-2 text-[1.45rem] font-bold leading-tight text-[var(--text-primary)]">Constructores (Top 5)</h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Tu escudería ya forma parte del home.</p>
                  </div>
                  <Link to="/leaderboard" className="text-sm font-semibold text-[var(--accent-blue)] transition-opacity hover:opacity-80">
                    Ver tabla
                  </Link>
                </div>
                <div className="space-y-2">
                  {topConstructors.map((entry, index) => {
                    const isFavorite = Boolean(user?.favoriteTeamId && user.favoriteTeamId === entry.teamId);
                    return (
                      <div
                        key={entry.teamId}
                        className={`rounded-lg border border-[var(--border-color)] px-3 py-2 ${isFavorite ? 'bg-[var(--accent-red)]/15' : 'bg-[var(--background-light)]'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="w-6 text-center text-sm font-semibold text-[var(--text-secondary)]">{index + 1}</span>
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: normalizeTeamColor(entry.teamColor) }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {entry.teamName}
                                {isFavorite && <span className="ml-2 text-xs font-semibold text-[var(--accent-red)]">· Tu equipo</span>}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">Supporters: {entry.supporters}</p>
                            </div>
                          </div>
                          <p className="font-mono text-lg font-bold text-[var(--accent-blue)]">{entry.totalPoints}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <AppDownloadMiniCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
