import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { NotificationSettings, ScheduledNotification, User } from '../types';

const DEFAULT_SETTINGS: NotificationSettings = {
    pushMirrorEnabled: true,
    predictionReminderEnabled: false,
    predictionReminderOffsets: [24],
    predictionReminderSessions: ['quali', 'sprint_qualy'],
    predictionReminderTitle: '⏰ Recordatorio {sessionName}',
    predictionReminderBody: 'No olvides completar tu predicción para {gpName}. Faltan {hours}h.',
};

const formatTimestamp = (value: any) => {
    if (!value) return '-';
    if (value.toDate) return value.toDate().toLocaleString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
};

const NotificationsManagement: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [route, setRoute] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [audienceType, setAudienceType] = useState<'all' | 'uids'>('all');
    const [audienceQuery, setAudienceQuery] = useState('');
    const [audienceSuggestions, setAudienceSuggestions] = useState<User[]>([]);
    const [audienceUsers, setAudienceUsers] = useState<User[]>([]);
    const [creating, setCreating] = useState(false);

    const [scheduledItems, setScheduledItems] = useState<ScheduledNotification[]>([]);
    const [loadingScheduled, setLoadingScheduled] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const offsetsInput = useMemo(() => settings.predictionReminderOffsets.join(', '), [settings.predictionReminderOffsets]);
    const [offsetsText, setOffsetsText] = useState(offsetsInput);

    useEffect(() => {
        const loadSettings = async () => {
            setLoadingSettings(true);
            const data = await db.getNotificationSettings();
            setSettings(data);
            setOffsetsText((data.predictionReminderOffsets || []).join(', '));
            setLoadingSettings(false);
        };
        loadSettings();
    }, []);

    useEffect(() => {
        const loadScheduled = async () => {
            setLoadingScheduled(true);
            const items = await db.listScheduledNotifications(30);
            setScheduledItems(items);
            setLoadingScheduled(false);
        };
        loadScheduled();
    }, [refreshKey]);

    useEffect(() => {
        if (audienceType !== 'uids') {
            setAudienceSuggestions([]);
            return;
        }
        const trimmed = audienceQuery.trim();
        if (!trimmed) {
            setAudienceSuggestions([]);
            return;
        }
        const handle = setTimeout(async () => {
            const results = await db.searchUsersByUsername(trimmed);
            const filtered = results.filter(
                candidate => !audienceUsers.some(existing => existing.id === candidate.id)
            );
            setAudienceSuggestions(filtered);
        }, 250);
        return () => clearTimeout(handle);
    }, [audienceQuery, audienceType, audienceUsers]);

    const handleSaveSettings = async () => {
        if (!user) return;
        setSavingSettings(true);
        const offsets = offsetsText
            .split(',')
            .map(value => parseFloat(value.trim()))
            .filter(value => Number.isFinite(value) && value > 0);
        const sessions = settings.predictionReminderSessions.length
            ? settings.predictionReminderSessions
            : DEFAULT_SETTINGS.predictionReminderSessions;
        await db.saveNotificationSettings(
            {
                ...settings,
                predictionReminderOffsets: offsets.length ? offsets : DEFAULT_SETTINGS.predictionReminderOffsets,
                predictionReminderSessions: sessions,
            },
            user.id
        );
        setSettings(prev => ({
            ...prev,
            predictionReminderOffsets: offsets.length ? offsets : DEFAULT_SETTINGS.predictionReminderOffsets,
            predictionReminderSessions: sessions,
        }));
        setSavingSettings(false);
    };

    const handleAddAudienceUser = (candidate: User) => {
        setAudienceUsers(prev => [...prev, candidate]);
        setAudienceQuery('');
        setAudienceSuggestions([]);
    };

    const handleRemoveAudienceUser = (id: string) => {
        setAudienceUsers(prev => prev.filter(user => user.id !== id));
    };

    const handleCreateNotification = async () => {
        if (!user) return;
        if (!title.trim() || !body.trim()) {
            alert('Completá título y cuerpo.');
            return;
        }
        if (audienceType === 'uids' && audienceUsers.length === 0) {
            alert('Seleccioná al menos un usuario.');
            return;
        }
        setCreating(true);
        const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date();
        await db.createScheduledNotification({
            title: title.trim(),
            body: body.trim(),
            scheduledAt: scheduledDate,
            audience:
                audienceType === 'all'
                    ? { type: 'all' }
                    : { type: 'uids', uids: audienceUsers.map(u => u.id) },
            data: route.trim() ? { route: route.trim() } : {},
            createdBy: user.id,
        });
        setTitle('');
        setBody('');
        setRoute('');
        setScheduledAt('');
        setAudienceQuery('');
        setAudienceUsers([]);
        setAudienceType('all');
        setCreating(false);
        setRefreshKey(key => key + 1);
    };

    const handleCancelScheduled = async (id?: string) => {
        if (!id) return;
        if (!window.confirm('¿Cancelar esta notificación programada?')) return;
        await db.cancelScheduledNotification(id);
        setRefreshKey(key => key + 1);
    };

    if (!user) return null;

    return (
        <div className="space-y-8">
            <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
                <h2 className="text-2xl font-bold f1-red-text mb-4">Automatizaciones</h2>
                {loadingSettings ? (
                    <p className="text-[var(--text-secondary)]">Cargando configuración...</p>
                ) : (
                    <div className="space-y-6">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={settings.pushMirrorEnabled}
                                onChange={(e) => setSettings(prev => ({ ...prev, pushMirrorEnabled: e.target.checked }))}
                            />
                            <span>Enviar push espejo de notificaciones in-app</span>
                        </label>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.predictionReminderEnabled}
                                    onChange={(e) => setSettings(prev => ({ ...prev, predictionReminderEnabled: e.target.checked }))}
                                />
                                <span>Recordatorios para completar predicciones</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Sesiones objetivo</label>
                                    <div className="flex flex-col gap-2">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={settings.predictionReminderSessions.includes('quali')}
                                                onChange={(e) =>
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        predictionReminderSessions: e.target.checked
                                                            ? Array.from(new Set([...prev.predictionReminderSessions, 'quali']))
                                                            : prev.predictionReminderSessions.filter(session => session !== 'quali'),
                                                    }))
                                                }
                                            />
                                            Qualy
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={settings.predictionReminderSessions.includes('sprint_qualy')}
                                                onChange={(e) =>
                                                    setSettings(prev => ({
                                                        ...prev,
                                                        predictionReminderSessions: e.target.checked
                                                            ? Array.from(new Set([...prev.predictionReminderSessions, 'sprint_qualy']))
                                                            : prev.predictionReminderSessions.filter(session => session !== 'sprint_qualy'),
                                                    }))
                                                }
                                            />
                                            Sprint Qualy
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">
                                        Horas antes (separadas por coma)
                                    </label>
                                    <input
                                        type="text"
                                        value={offsetsText}
                                        onChange={(e) => setOffsetsText(e.target.value)}
                                        className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                                        placeholder="24, 3, 1"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Título del recordatorio</label>
                                    <input
                                        type="text"
                                        value={settings.predictionReminderTitle || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, predictionReminderTitle: e.target.value }))}
                                        className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                                        placeholder="⏰ Recordatorio {sessionName}"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Mensaje del recordatorio</label>
                                    <input
                                        type="text"
                                        value={settings.predictionReminderBody || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, predictionReminderBody: e.target.value }))}
                                        className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                                        placeholder="No olvides completar tu predicción para {gpName}. Faltan {hours}h."
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings}
                            className="px-4 py-2 rounded-md bg-[var(--accent-red)] text-white font-bold hover:opacity-90 disabled:opacity-60"
                        >
                            {savingSettings ? 'Guardando...' : 'Guardar configuración'}
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)] space-y-6">
                <h2 className="text-2xl font-bold f1-red-text">Crear notificación personalizada</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                            placeholder="🏁 Resultados publicados"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Ruta (opcional)</label>
                        <input
                            type="text"
                            value={route}
                            onChange={(e) => setRoute(e.target.value)}
                            className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                            placeholder="/predictions o /tournaments"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Mensaje</label>
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-3 min-h-[120px]"
                        placeholder="Escribí el contenido del push..."
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Enviar</label>
                        <select
                            value={audienceType}
                            onChange={(e) => setAudienceType(e.target.value as 'all' | 'uids')}
                            className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                        >
                            <option value="all">Todos los usuarios</option>
                            <option value="uids">Usuarios específicos</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Programar (opcional)</label>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                        />
                    </div>
                </div>

                {audienceType === 'uids' && (
                    <div className="space-y-3">
                        <label className="block text-sm text-[var(--text-secondary)]">Seleccionar usuarios</label>
                        <input
                            type="text"
                            value={audienceQuery}
                            onChange={(e) => setAudienceQuery(e.target.value)}
                            className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                            placeholder="Buscar por username..."
                        />
                        {audienceSuggestions.length > 0 && (
                            <div className="bg-[var(--background-light)] rounded-md border border-[var(--border-color)] max-h-48 overflow-y-auto">
                                {audienceSuggestions.map(candidate => (
                                    <button
                                        key={candidate.id}
                                        type="button"
                                        onClick={() => handleAddAudienceUser(candidate)}
                                        className="w-full text-left px-3 py-2 hover:bg-[var(--background-medium)]"
                                    >
                                        {candidate.username}
                                    </button>
                                ))}
                            </div>
                        )}
                        {audienceUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {audienceUsers.map(candidate => (
                                    <button
                                        key={candidate.id}
                                        type="button"
                                        onClick={() => handleRemoveAudienceUser(candidate.id)}
                                        className="px-3 py-1 text-xs font-semibold rounded-full bg-[var(--background-light)] border border-[var(--border-color)] hover:text-[var(--accent-red)]"
                                    >
                                        {candidate.username} ✕
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={handleCreateNotification}
                    disabled={creating}
                    className="px-4 py-2 rounded-md bg-[var(--accent-blue)] text-black font-bold hover:opacity-90 disabled:opacity-60"
                >
                    {creating ? 'Programando...' : 'Crear notificación'}
                </button>
            </div>

            <div className="bg-[var(--background-medium)] p-6 rounded-lg border border-[var(--border-color)]">
                <h2 className="text-2xl font-bold f1-red-text mb-4">Notificaciones programadas</h2>
                {loadingScheduled ? (
                    <p className="text-[var(--text-secondary)]">Cargando...</p>
                ) : scheduledItems.length === 0 ? (
                    <p className="text-[var(--text-secondary)]">No hay notificaciones programadas.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--background-light)]">
                                <tr>
                                    <th className="p-3">Título</th>
                                    <th className="p-3">Estado</th>
                                    <th className="p-3">Programada</th>
                                    <th className="p-3">Audiencia</th>
                                    <th className="p-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduledItems.map(item => (
                                    <tr key={item.id} className="border-b border-[var(--border-color)]">
                                        <td className="p-3 font-medium">{item.title}</td>
                                        <td className="p-3 text-sm text-[var(--text-secondary)]">{item.status ?? 'pending'}</td>
                                        <td className="p-3 text-sm">{formatTimestamp(item.scheduledAt)}</td>
                                        <td className="p-3 text-sm">
                                            {item.audience?.type === 'uids'
                                                ? `Usuarios (${item.audience.uids?.length ?? 0})`
                                                : 'Todos'}
                                        </td>
                                        <td className="p-3 text-right">
                                            {item.status === 'pending' && (
                                                <button
                                                    onClick={() => handleCancelScheduled(item.id)}
                                                    className="px-3 py-1 text-xs font-bold rounded-md bg-[var(--background-light)] hover:bg-[var(--border-color)] transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsManagement;
