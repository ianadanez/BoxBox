import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ConfirmationModal from "./common/ConfirmationModal";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/db";
import {
  Season,
  SeasonImportDryRun,
  SeasonImportPayload,
  SeasonImportValidationResult,
  SeasonImportVersion,
} from "../types";

type PendingSeasonImport = {
  seasonId: string;
  fileName: string;
  payload: SeasonImportPayload;
  dryRun: SeasonImportDryRun;
};

const formatVersionDate = (rawDate: any): string => {
  if (!rawDate) return "sin fecha";
  try {
    const parsed =
      typeof rawDate?.toDate === "function" ? rawDate.toDate() : new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return "sin fecha";
    return parsed.toLocaleString();
  } catch (_error) {
    return "sin fecha";
  }
};

const SeasonManagement: React.FC = () => {
  const { user } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [newSeasonId, setNewSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<(() => Promise<void> | void) | null>(null);
  const [modalMessage, setModalMessage] = useState("");
  const [importingSeasonId, setImportingSeasonId] = useState<string | null>(null);
  const [downloadingSeasonId, setDownloadingSeasonId] = useState<string | null>(null);
  const [applyingImport, setApplyingImport] = useState(false);
  const [rollingBackSeasonId, setRollingBackSeasonId] = useState<string | null>(null);

  const [pendingImport, setPendingImport] = useState<PendingSeasonImport | null>(null);
  const [importValidation, setImportValidation] = useState<SeasonImportValidationResult | null>(null);
  const [versionsBySeason, setVersionsBySeason] = useState<Record<string, SeasonImportVersion[]>>({});
  const [selectedRollbackVersionBySeason, setSelectedRollbackVersionBySeason] = useState<Record<string, string>>({});

  const clearImportState = () => {
    setPendingImport(null);
    setImportValidation(null);
  };

  const loadSeasonVersionHistory = async (seasonIds: string[]) => {
    const entries = await Promise.all(
      seasonIds.map(async (seasonId) => {
        try {
          const versions = await db.listSeasonImportVersions(seasonId, 10);
          return [seasonId, versions] as const;
        } catch (err) {
          console.error(`Error loading import versions for season ${seasonId}:`, err);
          return [seasonId, []] as const;
        }
      })
    );

    const nextVersionsBySeason = Object.fromEntries(entries);
    setVersionsBySeason(nextVersionsBySeason);
    setSelectedRollbackVersionBySeason((current) => {
      const next = { ...current };
      entries.forEach(([seasonId, versions]) => {
        if (!next[seasonId] && versions.length > 0) {
          next[seasonId] = versions[0].id;
        }
      });
      return next;
    });
  };

  const fetchSeasons = async () => {
    setLoading(true);
    try {
      const seasonsList = await db.listSeasons();
      setSeasons(seasonsList);
      setError(null);
      await loadSeasonVersionHistory(seasonsList.map((season) => season.id));
    } catch (err) {
      console.error("Error fetching seasons:", err);
      setError("Failed to load seasons. Please check console for details.");
      toast.error("Error al cargar las temporadas.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  const handleCreateSeason = async () => {
    if (!newSeasonId.match(/^\d{4}$/)) {
      toast.error("El ID de la temporada debe ser un anio de 4 digitos (Ej: 2026).");
      return;
    }

    setModalMessage(
      `Estas seguro de que quieres crear la temporada ${newSeasonId}? Esto copiara calendario, pilotos y equipos por defecto.`
    );
    setActionToConfirm(() => async () => {
      try {
        toast.info(`Creando temporada ${newSeasonId}...`);
        await db.createNewSeason(newSeasonId);
        setNewSeasonId("");
        await fetchSeasons();
        toast.success(`Temporada ${newSeasonId} creada con exito.`);
      } catch (err: any) {
        console.error("Error creating season:", err);
        toast.error(err.message || "Error al crear la temporada.");
      }
    });
    setIsModalOpen(true);
  };

  const handleSwitchSeason = (seasonId: string) => {
    setModalMessage(
      `Estas seguro de que quieres cambiar a la temporada ${seasonId}? La temporada anterior se desactivara.`
    );
    setActionToConfirm(() => async () => {
      try {
        toast.info(`Cambiando a la temporada ${seasonId}...`);
        await db.switchActiveSeason(seasonId);
        await fetchSeasons();
        toast.success(`Temporada activa cambiada a ${seasonId}.`);
      } catch (err) {
        console.error("Error switching season:", err);
        toast.error("Error al cambiar la temporada activa.");
      }
    });
    setIsModalOpen(true);
  };

  const handleSetOffSeason = () => {
    setModalMessage(
      'Estas seguro de que quieres poner la app en "fuera de temporada"? Todas las temporadas se marcaran como inactivas.'
    );
    setActionToConfirm(() => async () => {
      try {
        toast.info("Poniendo la app en fuera de temporada...");
        await db.setOffSeason();
        await fetchSeasons();
        toast.success("La app esta ahora en modo fuera de temporada.");
      } catch (err) {
        console.error("Error setting off-season:", err);
        toast.error("Error al configurar el modo fuera de temporada.");
      }
    });
    setIsModalOpen(true);
  };

  const handleDateChange = (
    seasonId: string,
    field: "startDate" | "endDate",
    value: string
  ) => {
    setSeasons((currentSeasons) =>
      currentSeasons.map((season) =>
        season.id === seasonId ? { ...season, [field]: value } : season
      )
    );
  };

  const handleSaveChanges = async (season: Season) => {
    try {
      toast.info(`Guardando cambios para la temporada ${season.id}...`);
      await db.updateSeason(season);
      await fetchSeasons();
      toast.success(`Temporada ${season.id} actualizada con exito.`);
    } catch (err) {
      console.error(`Error updating season ${season.id}:`, err);
      toast.error(`Error al guardar la temporada ${season.id}.`);
    }
  };

  const handleImportJsonFile = (seasonId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      clearImportState();
      setImportingSeasonId(seasonId);
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        const validation = db.validateSeasonImportPayload(parsed);
        setImportValidation(validation);

        if (!validation.isValid) {
          toast.error("El JSON tiene errores. Revisa el detalle antes de importar.");
          return;
        }

        const payload = parsed as SeasonImportPayload;
        const dryRun = await db.getSeasonImportDryRun(seasonId, payload);
        setPendingImport({
          seasonId,
          fileName: file.name,
          payload,
          dryRun,
        });

        if (validation.warnings.length > 0) {
          toast.warning(`Previsualizacion lista con ${validation.warnings.length} advertencia(s).`);
        } else {
          toast.success(`Previsualizacion lista para temporada ${seasonId}.`);
        }
      } catch (err: any) {
        console.error("Error preparando importacion JSON:", err);
        if (err?.validation) {
          setImportValidation(err.validation);
        }
        toast.error(err.message || "Error al preparar la importacion.");
      } finally {
        setImportingSeasonId(null);
        input.value = "";
      }
    };
    input.click();
  };

  const handleDownloadSeasonJsonTemplate = async (seasonId: string) => {
    setDownloadingSeasonId(seasonId);
    try {
      const payload = await db.getSeasonImportPayload(seasonId);
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `season-${seasonId}-base.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Descargado JSON base para la temporada ${seasonId}.`);
    } catch (err) {
      console.error(`Error downloading base JSON for season ${seasonId}:`, err);
      toast.error("No se pudo descargar el JSON base.");
    } finally {
      setDownloadingSeasonId(null);
    }
  };

  const handleApplyPendingImport = () => {
    if (!pendingImport) return;
    const importToApply = pendingImport;

    setModalMessage(
      `Se aplicara la importacion para la temporada ${importToApply.seasonId} y se guardara una version de backup automatica. Deseas continuar?`
    );
    setActionToConfirm(() => async () => {
      setApplyingImport(true);
      try {
        const result = await db.importSeasonDataFromJson(
          importToApply.seasonId,
          importToApply.payload,
          {
            createdBy: user?.id,
            source: "json-file",
            note: `Importado desde ${importToApply.fileName}`,
          }
        );
        await fetchSeasons();
        clearImportState();
        toast.success(
          `Temporada ${importToApply.seasonId} importada. Backup: ${result.backupVersionId}.`
        );
      } catch (err: any) {
        console.error("Error applying JSON import:", err);
        if (err?.validation) {
          setImportValidation(err.validation);
        }
        toast.error(err.message || "Error al aplicar la importacion.");
      } finally {
        setApplyingImport(false);
      }
    });
    setIsModalOpen(true);
  };

  const handleRollbackVersion = (seasonId: string) => {
    const versionId = selectedRollbackVersionBySeason[seasonId];
    if (!versionId) {
      toast.error("Selecciona una version antes de restaurar.");
      return;
    }

    setModalMessage(
      `Se restaurara la version ${versionId} para la temporada ${seasonId}. Antes de aplicar, se guardara un backup del estado actual. Continuar?`
    );
    setActionToConfirm(() => async () => {
      setRollingBackSeasonId(seasonId);
      try {
        await db.rollbackSeasonImportVersion(seasonId, versionId, { createdBy: user?.id });
        await fetchSeasons();
        toast.success(`Temporada ${seasonId} restaurada con la version ${versionId}.`);
      } catch (err: any) {
        console.error("Error rolling back season import version:", err);
        if (err?.validation) {
          setImportValidation(err.validation);
        }
        toast.error(err.message || "Error al restaurar la version.");
      } finally {
        setRollingBackSeasonId(null);
      }
    });
    setIsModalOpen(true);
  };

  const handleConfirm = () => {
    if (actionToConfirm) {
      void actionToConfirm();
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

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-bold text-red-500 mb-3">Crear nueva temporada</h3>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={newSeasonId}
              onChange={(e) => setNewSeasonId(e.target.value)}
              placeholder="Ej: 2027"
              className="bg-gray-900 text-white border border-gray-700 rounded px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={handleCreateSeason}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-colors duration-200 whitespace-nowrap"
            >
              Crear temporada
            </button>
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-red-500 mb-3">Modo fuera de temporada</h3>
          <button
            onClick={handleSetOffSeason}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-6 rounded transition-colors duration-200"
          >
            Poner app fuera de temporada
          </button>
          <p className="text-gray-400 mt-2 text-sm">
            Esto desactiva la temporada activa actual para el periodo entre campeonatos.
          </p>
        </div>
      </div>

      {importValidation && !importValidation.isValid && (
        <div className="mb-6 rounded-lg border border-red-700 bg-red-900/30 p-4">
          <h4 className="text-red-300 font-semibold mb-2">Errores de validacion</h4>
          <p className="text-sm text-red-200 mb-2">
            Corrige estos campos en el JSON antes de aplicar la importacion.
          </p>
          <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
            {Object.entries(importValidation.fieldErrors).map(([field, messages]) => (
              <div key={field}>
                <div className="font-mono text-red-200">{field}</div>
                <ul className="list-disc list-inside text-red-100 ml-2">
                  {messages.map((message, index) => (
                    <li key={`${field}_${index}`}>{message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {importValidation && importValidation.warnings.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-700 bg-yellow-900/25 p-4">
          <h4 className="text-yellow-300 font-semibold mb-2">Advertencias</h4>
          <ul className="list-disc list-inside text-sm text-yellow-100 space-y-1">
            {importValidation.warnings.map((warning, index) => (
              <li key={`warning_${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {pendingImport && (
        <div className="mb-8 rounded-lg border border-purple-700 bg-purple-900/20 p-4">
          <h4 className="text-purple-200 text-lg font-semibold mb-2">Previsualizacion de importacion</h4>
          <p className="text-sm text-gray-300 mb-3">
            Archivo: <span className="font-mono">{pendingImport.fileName}</span> | Temporada:{" "}
            <span className="font-mono">{pendingImport.seasonId}</span>
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-sm text-left">
              <thead className="text-gray-300 border-b border-gray-700">
                <tr>
                  <th className="py-2 pr-4">Coleccion</th>
                  <th className="py-2 pr-4">Actual</th>
                  <th className="py-2 pr-4">Nuevo</th>
                  <th className="py-2 pr-4">Crear</th>
                  <th className="py-2 pr-4">Actualizar</th>
                  <th className="py-2 pr-4">Eliminar</th>
                  <th className="py-2">Sin cambios</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {(["schedule", "teams", "drivers"] as const).map((collectionName) => {
                  const row = pendingImport.dryRun.collections[collectionName];
                  return (
                    <tr key={collectionName} className="border-b border-gray-800">
                      <td className="py-2 pr-4 font-mono">{collectionName}</td>
                      <td className="py-2 pr-4">{row.currentCount}</td>
                      <td className="py-2 pr-4">{row.incomingCount}</td>
                      <td className="py-2 pr-4 text-green-300">{row.toCreate}</td>
                      <td className="py-2 pr-4 text-yellow-300">{row.toUpdate}</td>
                      <td className="py-2 pr-4 text-red-300">{row.toDelete}</td>
                      <td className="py-2">{row.unchanged}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleApplyPendingImport}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-60"
              disabled={applyingImport}
            >
              {applyingImport ? "Aplicando..." : "Aplicar importacion"}
            </button>
            <button
              onClick={clearImportState}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              disabled={applyingImport}
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Se guarda un backup automatico antes de cada importacion para permitir rollback.
          </p>
        </div>
      )}

      <div>
        <h3 className="text-2xl font-bold text-red-500 mb-4">Administrar temporadas</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-900 rounded-lg overflow-hidden">
            <thead className="bg-gray-950">
              <tr>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">
                  Temporada
                </th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">
                  Estado
                </th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">
                  Fecha inicio
                </th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">
                  Fecha fin
                </th>
                <th className="text-left py-3 px-4 uppercase font-semibold text-sm text-gray-300">
                  Acciones y versiones
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-400">
              {seasons.length > 0 ? (
                seasons.map((season) => {
                  const seasonVersions = versionsBySeason[season.id] || [];
                  const selectedVersion = selectedRollbackVersionBySeason[season.id] || "";
                  return (
                    <tr key={season.id} className="border-t border-gray-800 hover:bg-gray-850">
                      <td className="py-3 px-4 font-mono">{season.id}</td>
                      <td className="py-3 px-4">
                        {season.status === "active" ? (
                          <span className="bg-green-500 text-white text-xs font-bold mr-2 px-2.5 py-0.5 rounded-full">
                            Activa
                          </span>
                        ) : (
                          <span className="bg-gray-600 text-gray-200 text-xs font-bold mr-2 px-2.5 py-0.5 rounded-full">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={season.startDate?.split("T")[0] || ""}
                          onChange={(e) => handleDateChange(season.id, "startDate", e.target.value)}
                          className="bg-gray-700 text-white border-gray-600 rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={season.endDate?.split("T")[0] || ""}
                          onChange={(e) => handleDateChange(season.id, "endDate", e.target.value)}
                          className="bg-gray-700 text-white border-gray-600 rounded px-2 py-1 w-40 focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <button
                            onClick={() => handleSaveChanges(season)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm"
                          >
                            Guardar
                          </button>
                          {season.status !== "active" && (
                            <button
                              onClick={() => handleSwitchSeason(season.id)}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                            >
                              Activar
                            </button>
                          )}
                          <button
                            onClick={() => handleImportJsonFile(season.id)}
                            className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-1 px-3 rounded text-sm"
                            disabled={importingSeasonId === season.id}
                          >
                            {importingSeasonId === season.id ? "Leyendo..." : "Preparar importacion"}
                          </button>
                          <button
                            onClick={() => handleDownloadSeasonJsonTemplate(season.id)}
                            className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-1 px-3 rounded text-sm"
                            disabled={downloadingSeasonId === season.id}
                          >
                            {downloadingSeasonId === season.id ? "Descargando..." : "Descargar JSON base"}
                          </button>
                        </div>

                        <div className="rounded border border-gray-700 p-3 bg-gray-900/70">
                          <p className="text-xs text-gray-300 mb-2 uppercase tracking-wide">
                            Versiones guardadas
                          </p>
                          {seasonVersions.length > 0 ? (
                            <>
                              <select
                                value={selectedVersion}
                                onChange={(e) =>
                                  setSelectedRollbackVersionBySeason((current) => ({
                                    ...current,
                                    [season.id]: e.target.value,
                                  }))
                                }
                                className="w-full bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm mb-2"
                              >
                                {seasonVersions.map((version) => (
                                  <option key={version.id} value={version.id}>
                                    {version.id} - {formatVersionDate(version.createdAt)}
                                  </option>
                                ))}
                              </select>
                              <div className="text-xs text-gray-400 mb-2">
                                Snapshot:{" "}
                                {(() => {
                                  const selected = seasonVersions.find((version) => version.id === selectedVersion);
                                  if (!selected) return "sin datos";
                                  return `${selected.snapshotStats.scheduleCount} GP, ${selected.snapshotStats.teamsCount} equipos, ${selected.snapshotStats.driversCount} pilotos`;
                                })()}
                              </div>
                              <button
                                onClick={() => handleRollbackVersion(season.id)}
                                className="bg-orange-700 hover:bg-orange-800 text-white font-bold py-1 px-3 rounded text-sm"
                                disabled={rollingBackSeasonId === season.id}
                              >
                                {rollingBackSeasonId === season.id ? "Restaurando..." : "Restaurar version"}
                              </button>
                            </>
                          ) : (
                            <p className="text-xs text-gray-500">Sin versiones guardadas aun.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6">
                    No se encontraron temporadas. Crea una para empezar.
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
