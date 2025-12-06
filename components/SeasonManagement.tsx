
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Season } from '../types';
import { toast } from 'react-toastify';
import ConfirmationModal from './common/ConfirmationModal';

const SeasonManagement: React.FC = () => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [newSeasonId, setNewSeasonId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState<(() => void) | null>(null);
    const [modalMessage, setModalMessage] = useState('');

    const fetchSeasons = async () => {
        setLoading(true);
        try {
            const seasonsList = await db.listSeasons();
            setSeasons(seasonsList);
            setError(null);
        } catch (err) {
            console.error("Error fetching seasons:", err);
            setError('Failed to load seasons. Please check console for details.');
            toast.error('Error al cargar las temporadas.');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSeasons();
    }, []);

    const handleCreateSeason = async () => {
        if (!newSeasonId.match(/^\d{4}$/)) {
            toast.error('El ID de la temporada debe ser un año de 4 dígitos (Ej: 2024).');
            return;
        }

        setModalMessage(`¿Estás seguro de que quieres crear la temporada ${newSeasonId}? Esto copiará el calendario, pilotos y equipos por defecto.`);
        setActionToConfirm(() => async () => {
            try {
                toast.info(`Creando temporada ${newSeasonId}...`);
                await db.createNewSeason(newSeasonId);
                setNewSeasonId('');
                await fetchSeasons();
                toast.success(`¡Temporada ${newSeasonId} creada con éxito! Ahora puedes activarla y configurar sus fechas.`);
            } catch (err: any) {
                console.error("Error creating season:", err);
                toast.error(err.message || 'Error al crear la temporada.');
            }
        });
        setIsModalOpen(true);
    };

    const handleSwitchSeason = (seasonId: string) => {
        setModalMessage(`¿Estás seguro de que quieres cambiar a la temporada ${seasonId}? La temporada anterior se desactivará.`);
        setActionToConfirm(() => async () => {
            try {
                toast.info(`Cambiando a la temporada ${seasonId}...`);
                await db.switchActiveSeason(seasonId);
                await fetchSeasons();
                toast.success(`¡Temporada activa cambiada a ${seasonId}!`);
            } catch (err) {
                console.error("Error switching season:", err);
                toast.error('Error al cambiar la temporada activa.');
            }
        });
        setIsModalOpen(true);
    };

    const handleSetOffSeason = () => {
        setModalMessage('¿Estás seguro de que quieres poner la aplicación en modo "fuera de temporada"? Todas las temporadas se marcarán como inactivas.');
        setActionToConfirm(() => async () => {
            try {
                toast.info('Poniendo la aplicación en fuera de temporada...');
                await db.setOffSeason();
                await fetchSeasons();
                toast.success('La aplicación está ahora en modo fuera de temporada.');
            } catch (err) {
                console.error("Error setting off-season:", err);
                toast.error('Error al configurar el modo fuera de temporada.');
            }
        });
        setIsModalOpen(true);
    };

    const handleDateChange = (seasonId: string, field: 'startDate' | 'endDate', value: string) => {
        setSeasons(currentSeasons =>
            currentSeasons.map(s =>
                s.id === seasonId ? { ...s, [field]: value } : s
            )
        );
    };

    const handleSaveChanges = async (season: Season) => {
        try {
            toast.info(`Guardando cambios para la temporada ${season.id}...`);
            await db.updateSeason(season);
            await fetchSeasons(); // Refresca por si acaso
            toast.success(`¡Temporada ${season.id} actualizada con éxito!`);
        } catch (err) {
            console.error(`Error updating season ${season.id}:`, err);
            toast.error(`Error al guardar la temporada ${season.id}.`);
        }
    };

    const handleConfirm = () => {
        if (actionToConfirm) {
            actionToConfirm();
        }
        setIsModalOpen(false);
        setActionToConfirm(null);
    };

    if (loading) {
        return <div className="text-center p-4">Cargando temporadas...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-500">{error}</div>;
    }

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirm}
                message={modalMessage}
            />

            {/* --- Acciones Generales --- */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-bold text-red-500 mb-3">Crear Nueva Temporada</h3>
                     <div className="flex items-center space-x-4">
                        <input
                            type="text"
                            value={newSeasonId}
                            onChange={(e) => setNewSeasonId(e.target.value)}
                            placeholder="Ej: 2025"
                            className="bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <button
                            onClick={handleCreateSeason}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors duration-200 whitespace-nowrap"
                        >
                            Crear Temporada
                        </button>
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-bold text-red-500 mb-3">Modo Fuera de Temporada</h3>
                    <button
                        onClick={handleSetOffSeason}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded transition-colors duration-200"
                    >
                        Poner App Fuera de Temporada
                    </button>
                     <p className="text-gray-400 mt-2 text-sm">
                        Esto desactivará la temporada activa actual, ideal para el período entre campeonatos.
                    </p>
                </div>
            </div>

            {/* --- Temporadas Existentes --- */}
            <div>
                <h3 className="text-2xl font-bold text-red-500 mb-4">Administrar Temporadas</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-gray-900 rounded-lg overflow-hidden">
                        <thead className="bg-gray-950">
                            <tr>
                                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">Temporada</th>
                                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">Estado</th>
                                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">Fecha Inicio</th>
                                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">Fecha Fin</th>
                                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-400">
                            {seasons.length > 0 ? (
                                seasons.map((season) => (
                                    <tr key={season.id} className="border-t border-gray-800 hover:bg-gray-850">
                                        <td className="py-3 px-4 font-mono">{season.id}</td>
                                        <td className="py-3 px-4">
                                            {season.status === 'active' ? (
                                                <span className="bg-green-500 text-white text-xs font-bold mr-2 px-2.5 py-0.5 rounded-full">Activa</span>
                                            ) : (
                                                <span className="bg-gray-600 text-gray-200 text-xs font-bold mr-2 px-2.5 py-0.5 rounded-full">Inactiva</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <input
                                                type="date"
                                                value={season.startDate?.split('T')[0] || ''}
                                                onChange={(e) => handleDateChange(season.id, 'startDate', e.target.value)}
                                                className="bg-gray-700 text-white border-gray-600 rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-red-500"
                                            />
                                        </td>
                                        <td className="py-3 px-4">
                                             <input
                                                type="date"
                                                value={season.endDate?.split('T')[0] || ''}
                                                onChange={(e) => handleDateChange(season.id, 'endDate', e.target.value)}
                                                className="bg-gray-700 text-white border-gray-600 rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-red-500"
                                            />
                                        </td>
                                        <td className="py-3 px-4 space-x-2 flex items-center">
                                            <button
                                                onClick={() => handleSaveChanges(season)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                                            >
                                                Guardar
                                            </button>
                                            {season.status !== 'active' && (
                                                <button
                                                    onClick={() => handleSwitchSeason(season.id)}
                                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                                                >
                                                    Activar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-6">
                                        No se encontraron temporadas. ¡Crea una para empezar!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SeasonManagement;
