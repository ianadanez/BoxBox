import React from 'react';
import { GrandPrix } from '../../types';

export type GpSessionItem = {
  key: 'sprintQuali' | 'sprint' | 'quali' | 'race';
  label: string;
  time: string;
  isUpcoming: boolean;
  isCompleted: boolean;
};

const SESSION_LABELS: Record<GpSessionItem['key'], string> = {
  sprintQuali: 'Sprint Qualy',
  sprint: 'Sprint',
  quali: 'Clasificación',
  race: 'Carrera',
};

const SESSION_ORDER: GpSessionItem['key'][] = ['sprintQuali', 'sprint', 'quali', 'race'];

const formatSessionDate = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));

export const getGpSessionItems = (gp: GrandPrix, now = new Date()): GpSessionItem[] => {
  const nowTs = now.getTime();

  return SESSION_ORDER
    .map((key) => {
      const time = gp.events[key];
      if (!time) return null;
      const ts = new Date(time).getTime();
      return {
        key,
        label: SESSION_LABELS[key],
        time,
        isUpcoming: ts >= nowTs,
        isCompleted: ts < nowTs,
      } as GpSessionItem;
    })
    .filter((item): item is GpSessionItem => Boolean(item));
};

export const getNextGpSession = (gp: GrandPrix, now = new Date()): GpSessionItem | null =>
  getGpSessionItems(gp, now).find((session) => session.isUpcoming) || null;

interface GpWeekendAgendaProps {
  gp: GrandPrix;
  compact?: boolean;
  className?: string;
}

const GpWeekendAgenda: React.FC<GpWeekendAgendaProps> = ({ gp, compact = false, className = '' }) => {
  const sessions = getGpSessionItems(gp);
  const nextSession = sessions.find((session) => session.isUpcoming) || null;

  return (
    <div className={className}>
      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'}`}>
        {sessions.map((session) => {
          const isNext = nextSession?.key === session.key;
          return (
            <div
              key={session.key}
              className={[
                'rounded-xl border px-3 py-3 transition-colors',
                isNext
                  ? 'border-[var(--accent-red)] bg-[var(--accent-red)]/10'
                  : session.isCompleted
                  ? 'border-[var(--border-color)] bg-[var(--background-dark)]/50 opacity-70'
                  : 'border-[var(--border-color)] bg-[var(--background-light)]',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-secondary)]">{session.label}</p>
                  <p className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-[var(--text-primary)]`}>
                    {formatSessionDate(session.time)}
                  </p>
                </div>
                {isNext && (
                  <span className="shrink-0 rounded-full bg-[var(--accent-red)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                    Sigue
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GpWeekendAgenda;
