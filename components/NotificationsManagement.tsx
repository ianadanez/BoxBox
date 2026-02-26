import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { NotificationSettings, ReminderTemplate, ScheduledNotification, User } from '../types';

const DEFAULT_SETTINGS: NotificationSettings = {
    pushMirrorEnabled: true,
    predictionReminderEnabled: false,
    predictionReminderSessions: ['quali', 'sprint_qualy'],
    predictionReminderCount: 3,
    predictionReminderWindowHours: 24,
    predictionReminderFinalOffsetMinutes: 10,
    predictionReminderTemplates: [
        {
            id: 'default_1',
            title: '⏰ Recordatorio {sessionName}',
            body: 'No olvides completar tu predicción para {gpName}. Faltan {hours}h.',
            enabled: true,
            weight: 1,
        },
        {
            id: 'default_2',
            title: '🏎️ Se viene {gpName}',
            body: 'Tu formulario cierra pronto. Quedan {minutes} minutos para {sessionName}.',
            enabled: true,
            weight: 1,
        },
    ],
};

const formatTimestamp = (value: any) => {
    if (!value) return '-';
    if (value.toDate) return value.toDate().toLocaleString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
};

const formatDeliveryStatus = (item: ScheduledNotification) => {
    const status = item.pushReceiptStatus;
    if (!status) {
        if (item.status === 'sent') return 'enviada';
        return '-';
    }
    if (status === 'delivered') return 'entregada';
    if (status === 'partial') return 'parcial';
    if (status === 'error') return 'error';
    if (status === 'pending') return 'pendiente';
    return status;
};

const createEmptyTemplate = (index: number): ReminderTemplate => ({
    id: `tpl_${Date.now()}_${index}`,
    title: '⏰ Recordatorio {sessionName}',
    body: 'No olvides completar tu predicción para {gpName}.',
    enabled: true,
    weight: 1,
});

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

    useEffect(() => {
        const loadSettings = async () => {
            setLoadingSettings(true);
            const data = await db.getNotificationSettings();
            setSettings(data);
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
        const sessions = settings.predictionReminderSessions.length
            ? settings.predictionReminderSessions
            : DEFAULT_SETTINGS.predictionReminderSessions;
        const templates = settings.predictionReminderTemplates
            .map((template, index) => ({
                id: template.id || `tpl_${index + 1}`,
                title: template.title.trim(),
                body: template.body.trim(),
                enabled: template.enabled !== false,
                weight: Number.isFinite(template.weight) ? Math.max(0.1, Number(template.weight)) : 1,
            }))
            .filter(template => template.title && template.body);
        const sanitizedCount = Math.max(1, Math.min(6, Math.round(settings.predictionReminderCount || 1)));
        const sanitizedWindow = Math.max(1, Math.min(120, Number(settings.predictionReminderWindowHours) || 24));
        await db.saveNotificationSettings(
            {
                ...settings,
                predictionReminderSessions: sessions,
                predictionReminderCount: sanitizedCount,
                predictionReminderWindowHours: sanitizedWindow,
                predictionReminderFinalOffsetMinutes: 10,
                predictionReminderTemplates: templates.length ? templates : DEFAULT_SETTINGS.predictionReminderTemplates,
            },
            user.id
        );
        setSettings(prev => ({
            ...prev,
            predictionReminderSessions: sessions,
            predictionReminderCount: sanitizedCount,
            predictionReminderWindowHours: sanitizedWindow,
            predictionReminderFinalOffsetMinutes: 10,
            predictionReminderTemplates: templates.length ? templates : DEFAULT_SETTINGS.predictionReminderTemplates,
        }));
        setSavingSettings(false);
    };

    const updateTemplate = (index: number, patch: Partial<ReminderTemplate>) => {
        setSettings(prev => ({
            ...prev,
            predictionReminderTemplates: prev.predictionReminderTemplates.map((template, templateIndex) =>
                templateIndex === index ? { ...template, ...patch } : template
            ),
        }));
    };

    const addTemplate = () => {
        setSettings(prev => ({
            ...prev,
            predictionReminderTemplates: [
                ...prev.predictionReminderTemplates,
                createEmptyTemplate(prev.predictionReminderTemplates.length + 1),
            ],
        }));
    };

    const removeTemplate = (index: number) => {
        setSettings(prev => ({
            ...prev,
            predictionReminderTemplates: prev.predictionReminderTemplates.filter((_, templateIndex) => templateIndex !== index),
        }));
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Cantidad de reminders</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={6}
                                        value={settings.predictionReminderCount}
                                        onChange={(e) =>
                                            setSettings(prev => ({
                                                ...prev,
                                                predictionReminderCount: Number(e.target.value),
                                            }))
                                        }
                                        className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Período (horas antes del cierre)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={120}
                                        value={settings.predictionReminderWindowHours}
                                        onChange={(e) =>
                                            setSettings(prev => ({
                                                ...prev,
                                                predictionReminderWindowHours: Number(e.target.value),
                                            }))
                                        }
                                        className="w-full bg-[var(--background-light)] border border-[var(--border-color)] rounded-md p-2"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-[var(--text-secondary)]">
                                El último reminder se envía siempre 10 minutos antes del cierre del formulario.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm text-[var(--text-secondary)]">Plantillas aleatorias</label>
                                    <button
                                        type="button"
                                        onClick={addTemplate}
                                        className="px-3 py-1 text-xs font-bold rounded-md bg-[var(--background-light)] border border-[var(--border-color)] hover:opacity-90"
                                    >
                                        + Agregar plantilla
                                    </button>
                                </div>
                                {settings.predictionReminderTemplates.map((template, index) => (
                                    <div key={template.id || index} className="border border-[var(--border-color)] rounded-md p-3 space-y-3 bg-[var(--background-light)]">
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={template.enabled !== false}
                                                    onChange={(e) => updateTemplate(index, { enabled: e.target.checked })}
                                                />
                                                Activa
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => removeTemplate(index)}
                                                disabled={settings.predictionReminderTemplates.length <= 1}
                                                className="px-2 py-1 text-xs font-bold rounded-md bg-[var(--background-medium)] border border-[var(--border-color)] disabled:opacity-40"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs text-[var(--text-secondary)] mb-1">Título</label>
                                                <input
                                                    type="text"
                                                    value={template.title}
                                                    onChange={(e) => updateTemplate(index, { title: e.target.value })}
                                                    className="w-full bg-[var(--background-medium)] border border-[var(--border-color)] rounded-md p-2"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[var(--text-secondary)] mb-1">Peso aleatorio</label>
                                                <input
                                                    type="number"
                                                    min={0.1}
                                                    step={0.1}
                                                    value={template.weight ?? 1}
                                                    onChange={(e) => updateTemplate(index, { weight: Number(e.target.value) })}
                                                    className="w-full bg-[var(--background-medium)] border border-[var(--border-color)] rounded-md p-2"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Mensaje</label>
                                            <input
                                                type="text"
                                                value={template.body}
                                                onChange={(e) => updateTemplate(index, { body: e.target.value })}
                                                className="w-full bg-[var(--background-medium)] border border-[var(--border-color)] rounded-md p-2"
                                            />
                                        </div>
                                    </div>
                                ))}
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
                                    <th className="p-3">Entrega</th>
                                    <th className="p-3">Programada</th>
                                    <th className="p-3">Audiencia</th>
                                    <th className="p-3">Aperturas</th>
                                    <th className="p-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scheduledItems.map(item => (
                                    <tr key={item.id} className="border-b border-[var(--border-color)]">
                                        <td className="p-3 font-medium">{item.title}</td>
                                        <td className="p-3 text-sm text-[var(--text-secondary)]">{item.status ?? 'pending'}</td>
                                        <td className="p-3 text-sm text-[var(--text-secondary)]">
                                            {formatDeliveryStatus(item)}
                                            {typeof item.pushReceiptOkCount === 'number' || typeof item.pushReceiptErrorCount === 'number' ? (
                                                <div className="text-xs text-[var(--text-secondary)] mt-1">
                                                    ok: {item.pushReceiptOkCount ?? 0} / err: {item.pushReceiptErrorCount ?? 0}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="p-3 text-sm">{formatTimestamp(item.scheduledAt)}</td>
                                        <td className="p-3 text-sm">
                                            {item.audience?.type === 'uids'
                                                ? `Usuarios (${item.audience.uids?.length ?? 0})`
                                                : 'Todos'}
                                        </td>
                                        <td className="p-3 text-sm text-[var(--text-secondary)]">{item.pushOpenedCount ?? 0}</td>
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
