import { GrandPrix, Prediction, OfficialResult, GpScore, SeasonTotal, User, PointAdjustment } from '../types';
import { SCORING_RULES as RULES, LOCK_MINUTES_BEFORE } from '../constants';

export const engine = {
    /**
     * Calcula si un GP está bloqueado para predicciones basado en la hora actual.
     */
    getLockStatus: (gp: GrandPrix, now: Date = new Date()) => {
        const getLockTime = (eventTime: string) => new Date(new Date(eventTime).getTime() - LOCK_MINUTES_BEFORE * 60 * 1000);
        
        const raceLockTime = getLockTime(gp.events.quali);
        const isRaceLocked = now > raceLockTime;

        let isSprintLocked = false;
        if (gp.hasSprint) {
            // Si hay fecha específica de Sprint Shootout (sprintQuali), usamos esa. Si no, usamos la quali principal como fallback.
            const sprintEventTime = gp.events.sprintQuali || gp.events.quali;
            const sprintLockTime = getLockTime(sprintEventTime);
            isSprintLocked = now > sprintLockTime;
        }

        return { isRaceLocked, isSprintLocked };
    },

    /**
     * Calcula el puntaje de una sola predicción contra un resultado oficial.
     */
    calculateGpScore: (gp: GrandPrix, prediction: Prediction, result: OfficialResult): GpScore => {
        const score: GpScore = {
            gpId: result.gpId,
            gpName: gp.name,
            totalPoints: 0,
            breakdown: {
                pole: 0, sprintPole: 0, sprintPodium: 0,
                racePodium: 0, fastestLap: 0, driverOfTheDay: 0
            }
        };

        // Pole Position
        if (result.pole && result.pole === prediction.pole) {
            score.breakdown.pole += RULES.pole;
        }

        // Vuelta Rápida
        if (result.fastestLap && result.fastestLap === prediction.fastestLap) {
            score.breakdown.fastestLap += RULES.fastestLap;
        }

        // Piloto del Día
        if (result.driverOfTheDay && result.driverOfTheDay === prediction.driverOfTheDay) {
            score.breakdown.driverOfTheDay += RULES.driverOfTheDay;
        }

        // Podio Carrera
        if (result.racePodium && prediction.racePodium) {
            if (result.racePodium[0] === prediction.racePodium[0]) score.breakdown.racePodium += RULES.racePodium.p1;
            if (result.racePodium[1] === prediction.racePodium[1]) score.breakdown.racePodium += RULES.racePodium.p2;
            if (result.racePodium[2] === prediction.racePodium[2]) score.breakdown.racePodium += RULES.racePodium.p3;
            
            const correctPositions = [
                prediction.racePodium[0] === result.racePodium[0], 
                prediction.racePodium[1] === result.racePodium[1], 
                prediction.racePodium[2] === result.racePodium[2]
            ];
            
            prediction.racePodium.forEach((driverId, index) => {
                if (driverId && (result.racePodium as readonly string[]).includes(driverId) && !correctPositions[index]) {
                    score.breakdown.racePodium += RULES.racePodium.inPodium;
                }
            });
        }

        // Sprint Pole
        if (result.sprintPole && result.sprintPole === prediction.sprintPole) {
            score.breakdown.sprintPole += RULES.sprintPole;
        }

        // Sprint Podio
        if (result.sprintPodium && prediction.sprintPodium) {
            if (result.sprintPodium[0] === prediction.sprintPodium[0]) score.breakdown.sprintPodium += RULES.sprintPodium.p1;
            if (result.sprintPodium[1] === prediction.sprintPodium[1]) score.breakdown.sprintPodium += RULES.sprintPodium.p2;
            if (result.sprintPodium[2] === prediction.sprintPodium[2]) score.breakdown.sprintPodium += RULES.sprintPodium.p3;

            const correctSprintPositions = [
                prediction.sprintPodium[0] === result.sprintPodium[0], 
                prediction.sprintPodium[1] === result.sprintPodium[1], 
                prediction.sprintPodium[2] === result.sprintPodium[2]
            ];
            
            prediction.sprintPodium.forEach((driverId, index) => {
                if (driverId && (result.sprintPodium as readonly string[]).includes(driverId) && !correctSprintPositions[index]) {
                    score.breakdown.sprintPodium += RULES.sprintPodium.inPodium;
                }
            });
        }

        score.totalPoints = Object.values(score.breakdown).reduce((a, b) => a + b, 0);
        return score;
    },

    /**
     * Calcula la tabla de posiciones completa de la temporada.
     */
    calculateSeasonStandings: (
        users: User[], 
        predictions: Prediction[], 
        officialResults: OfficialResult[], 
        adjustments: PointAdjustment[]
    ): SeasonTotal[] => {
        const scores: { [userId: string]: SeasonTotal } = {};

        // 1. Inicializar scores para todos los usuarios
        users.forEach(user => {
            scores[user.id] = {
                userId: user.id,
                userUsername: user.username,
                userAvatar: user.avatar,
                totalPoints: 0,
                details: { exactPole: 0, exactP1: 0, exactFastestLap: 0 },
                pointAdjustments: [],
            };
        });

        // 2. Procesar cada resultado oficial
        officialResults.forEach(result => {
            // Filtrar predicciones para este GP específico
            const gpPredictions = predictions.filter(p => p.gpId === result.gpId);
            
            // Simular un objeto GP mínimo necesario para el cálculo (ya que tenemos el ID y si es sprint en el resultado si lo enriquecemos, pero por ahora asumimos logica estándar)
            // Nota: Para cálculo perfecto necesitamos saber si tiene sprint, pero SCORING_RULES maneja 0 puntos si no hay datos.
            // Creamos un mock GP seguro para pasar al calculador de GP
            const mockGp: GrandPrix = { 
                id: result.gpId, name: '', country: '', track: '', events: { quali: '', race: '' }, 
                hasSprint: !!result.sprintPole || !!result.sprintPodium // Inferimos si hubo sprint por los resultados
            };

            gpPredictions.forEach(pred => {
                if (!scores[pred.userId]) return;

                const gpScore = engine.calculateGpScore(mockGp, pred, result);
                
                scores[pred.userId].totalPoints += gpScore.totalPoints;

                // Estadísticas detalladas (Aciertos exactos)
                if (result.pole && result.pole === pred.pole) scores[pred.userId].details.exactPole++;
                if (result.fastestLap && result.fastestLap === pred.fastestLap) scores[pred.userId].details.exactFastestLap++;
                if (result.racePodium && pred.racePodium && result.racePodium[0] === pred.racePodium[0]) scores[pred.userId].details.exactP1++;
            });
        });

        // 3. Aplicar ajustes manuales de puntos
        adjustments.forEach(adj => {
            if (scores[adj.userId]) {
                scores[adj.userId].totalPoints += adj.points;
                scores[adj.userId].pointAdjustments?.push(adj);
            }
        });

        // 4. Retornar array ordenado
        return Object.values(scores).sort((a, b) => b.totalPoints - a.totalPoints);
    }
};