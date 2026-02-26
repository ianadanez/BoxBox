import React from 'react';
import Avatar from './Avatar';
import { Avatar as AvatarType } from '../../types';

type StandingEntry = {
    userId: string;
    userUsername?: string;
    userAvatar?: AvatarType;
    totalPoints?: number;
    points?: number;
    details?: {
        exactP1?: number;
        exactPole?: number;
    };
};

interface StandingsTableProps<T extends StandingEntry> {
    title?: string;
    standings: T[];
    page: number;
    perPage?: number;
    onPageChange: (page: number) => void;
    emptyMessage?: string;
    actionButtonLabel?: string;
    onActionClick?: (item: T) => void;
    renderUserCell?: (item: T) => React.ReactNode;
    highlightUserId?: string;
    highlightLabel?: string;
}

/**
 * Reusable standings table with pagination and optional action button.
 * Assumes items include username/avatar and either totalPoints or points.
 */
const StandingsTable = <T extends StandingEntry>({
    title,
    standings,
    page,
    perPage = 10,
    onPageChange,
    emptyMessage = 'No hay datos para mostrar.',
    actionButtonLabel,
    onActionClick,
    renderUserCell,
    highlightUserId,
    highlightLabel = '· Tú',
}: StandingsTableProps<T>) => {
    if (!standings || standings.length === 0) {
        return <p className="text-center text-gray-400">{emptyMessage}</p>;
    }

    const totalPages = Math.max(1, Math.ceil(standings.length / perPage));
    const currentPage = Math.min(page, totalPages - 1);
    const pageData = standings.slice(currentPage * perPage, (currentPage + 1) * perPage);

    const renderPoints = (item: T) => item.totalPoints ?? item.points ?? 0;
    const renderValue = (value?: number) => (value ?? '-') as React.ReactNode;

    return (
        <div className="space-y-4 bg-[var(--background-medium)] border border-[var(--border-color)] rounded-xl p-4 sm:p-6 shadow-lg shadow-black/20">
            {title && <h3 className="text-xl sm:text-2xl font-bold text-center">{title}</h3>}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-[var(--border-color)]">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-center">Pos</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">Usuario</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-right">Puntos</th>
                            <th className="hidden md:table-cell p-3 text-sm font-semibold tracking-wide text-center">P1</th>
                            <th className="hidden md:table-cell p-3 text-sm font-semibold tracking-wide text-center">Pole</th>
                            {onActionClick && <th className="p-3 text-sm font-semibold tracking-wide text-right">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.map((item, index) => {
                            const isHighlighted = Boolean(highlightUserId && item.userId === highlightUserId);
                            return (
                            <tr
                                key={`${item.userId}-${index}`}
                                className={`border-b border-[var(--border-color)] ${isHighlighted ? 'bg-[var(--accent-red)]/15' : ''}`}
                            >
                                <td className={`p-3 text-lg font-bold text-center text-[var(--text-secondary)] ${isHighlighted ? 'border-l-4 border-[var(--accent-red)]' : ''}`}>
                                    {(currentPage * perPage) + index + 1}
                                </td>
                                <td className="p-2 font-medium">
                                    {renderUserCell ? (
                                        renderUserCell(item)
                                    ) : (
                                        <div className="flex items-center space-x-3 group">
                                            <Avatar avatar={item.userAvatar} className="w-10 h-10" />
                                            <span className="group-hover:text-[var(--accent-red)] transition-colors">
                                                {item.userUsername || 'N/A'}
                                                {isHighlighted && (
                                                    <span className="ml-2 text-xs font-semibold text-[var(--accent-red)]">
                                                        {highlightLabel}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 text-right font-mono text-lg font-bold text-[var(--accent-blue)]">
                                    {renderPoints(item)}
                                </td>
                                <td className="hidden md:table-cell p-3 text-center font-mono text-gray-400">
                                    {renderValue(item.details?.exactP1)}
                                </td>
                                <td className="hidden md:table-cell p-3 text-center font-mono text-gray-400">
                                    {renderValue(item.details?.exactPole)}
                                </td>
                                {onActionClick && (
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() => onActionClick(item)}
                                            className="px-3 py-1 text-xs font-bold rounded-md bg-[var(--background-light)] hover:bg-[var(--border-color)] transition-colors"
                                        >
                                            {actionButtonLabel || 'Ver'}
                                        </button>
                                    </td>
                                )}
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--background-light)] hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-[var(--text-secondary)]">
                        Página {currentPage + 1} de {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--background-light)] hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Siguiente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StandingsTable;
