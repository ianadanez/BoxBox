"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.engine = void 0;
const constants_1 = require("./constants");
// This is a stripped-down version of the engine, containing only the logic needed for the cloud function.
exports.engine = {
    calculateGpScore: (gp, prediction, result) => {
        const score = {
            gpId: result.gpId,
            gpName: gp.name, // GP Name is added for convenience
            totalPoints: 0,
            breakdown: {
                pole: 0, sprintPole: 0, sprintPodium: 0,
                racePodium: 0, fastestLap: 0, driverOfTheDay: 0
            }
        };
        // Pole Position
        if (result.pole && result.pole === prediction.pole) {
            score.breakdown.pole += constants_1.SCORING_RULES.pole;
        }
        // Vuelta Rápida
        if (result.fastestLap && result.fastestLap === prediction.fastestLap) {
            score.breakdown.fastestLap += constants_1.SCORING_RULES.fastestLap;
        }
        // Piloto del Día
        if (result.driverOfTheDay && result.driverOfTheDay === prediction.driverOfTheDay) {
            score.breakdown.driverOfTheDay += constants_1.SCORING_RULES.driverOfTheDay;
        }
        // Podio Carrera
        if (result.racePodium && prediction.racePodium) {
            if (result.racePodium[0] === prediction.racePodium[0])
                score.breakdown.racePodium += constants_1.SCORING_RULES.racePodium.p1;
            if (result.racePodium[1] === prediction.racePodium[1])
                score.breakdown.racePodium += constants_1.SCORING_RULES.racePodium.p2;
            if (result.racePodium[2] === prediction.racePodium[2])
                score.breakdown.racePodium += constants_1.SCORING_RULES.racePodium.p3;
            const correctPositions = [
                prediction.racePodium[0] === result.racePodium[0],
                prediction.racePodium[1] === result.racePodium[1],
                prediction.racePodium[2] === result.racePodium[2]
            ];
            prediction.racePodium.forEach((driverId, index) => {
                if (driverId && result.racePodium.includes(driverId) && !correctPositions[index]) {
                    score.breakdown.racePodium += constants_1.SCORING_RULES.racePodium.inPodium;
                }
            });
        }
        // Sprint Pole
        if (result.sprintPole && result.sprintPole === prediction.sprintPole) {
            score.breakdown.sprintPole += constants_1.SCORING_RULES.sprintPole;
        }
        // Sprint Podio
        if (result.sprintPodium && prediction.sprintPodium) {
            if (result.sprintPodium[0] === prediction.sprintPodium[0])
                score.breakdown.sprintPodium += constants_1.SCORING_RULES.sprintPodium.p1;
            if (result.sprintPodium[1] === prediction.sprintPodium[1])
                score.breakdown.sprintPodium += constants_1.SCORING_RULES.sprintPodium.p2;
            if (result.sprintPodium[2] === prediction.sprintPodium[2])
                score.breakdown.sprintPodium += constants_1.SCORING_RULES.sprintPodium.p3;
            const correctSprintPositions = [
                prediction.sprintPodium[0] === result.sprintPodium[0],
                prediction.sprintPodium[1] === result.sprintPodium[1],
                prediction.sprintPodium[2] === result.sprintPodium[2]
            ];
            prediction.sprintPodium.forEach((driverId, index) => {
                if (driverId && result.sprintPodium.includes(driverId) && !correctSprintPositions[index]) {
                    score.breakdown.sprintPodium += constants_1.SCORING_RULES.sprintPodium.inPodium;
                }
            });
        }
        score.totalPoints = Object.values(score.breakdown).reduce((a, b) => a + b, 0);
        return score;
    },
};
//# sourceMappingURL=engine.js.map