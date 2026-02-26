import React from 'react';
import { SCORING_RULES, LOCK_MINUTES_BEFORE } from '../constants';
import { Link } from 'react-router-dom';

const ChevronRightIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);


const HowToPlayPage: React.FC = () => {
    
    const renderScoringTable = () => (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
            <table className="min-w-full text-left text-sm text-[var(--text-secondary)]">
                <thead className="bg-[var(--background-light)] text-xs text-[var(--text-primary)] uppercase tracking-wider">
                    <tr>
                        <th scope="col" className="px-6 py-3 font-bold">Acierto</th>
                        <th scope="col" className="px-6 py-3 font-bold text-right">Puntos</th>
                    </tr>
                </thead>
                <tbody className="bg-[var(--background-medium)] divide-y divide-[var(--border-color)]">
                    <tr>
                        <td className="px-6 py-4 font-semibold">Pole Position (Clasificación Principal)</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.pole}</td>
                    </tr>
                    <tr>
                        <td className="px-6 py-4 font-semibold">Vuelta Rápida (Carrera)</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.fastestLap}</td>
                    </tr>
                    <tr>
                        <td className="px-6 py-4 font-semibold">Piloto del Día (Carrera)</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.driverOfTheDay}</td>
                    </tr>
                     <tr>
                        <td className="px-6 py-4 font-semibold">Pole del Sprint</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.sprintPole}</td>
                    </tr>
                    <tr className="bg-[var(--background-light)]">
                        <td className="px-6 py-4 font-bold text-base text-[var(--text-primary)]" colSpan={2}>Podio de la Carrera</td>
                    </tr>
                    <tr>
                        <td className="px-6 py-4 pl-10">🥇 P1 Exacto</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.racePodium.p1}</td>
                    </tr>
                     <tr>
                        <td className="px-6 py-4 pl-10">🥈 P2 Exacto</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.racePodium.p2}</td>
                    </tr>
                     <tr>
                        <td className="px-6 py-4 pl-10">🥉 P3 Exacto</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.racePodium.p3}</td>
                    </tr>
                    <tr>
                        <td className="px-6 py-4 pl-10">Piloto en el podio (posición incorrecta)</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-yellow-400">{SCORING_RULES.racePodium.inPodium}</td>
                    </tr>
                     <tr className="bg-[var(--background-light)]">
                        <td className="px-6 py-4 font-bold text-base text-[var(--text-primary)]" colSpan={2}>Podio del Sprint</td>
                    </tr>
                    <tr>
                        <td className="px-6 py-4 pl-10">🥇 P1 Exacto (Sprint)</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.sprintPodium.p1}</td>
                    </tr>
                     <tr>
                        <td className="px-6 py-4 pl-10">🥈 P2 Exacto (Sprint)</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.sprintPodium.p2}</td>
                    </tr>
                     <tr>
                        <td className="px-6 py-4 pl-10">🥉 P3 Exacto (Sprint)</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-[var(--accent-blue)]">{SCORING_RULES.sprintPodium.p3}</td>
                    </tr>
                    <tr>
                        <td className="px-6 py-4 pl-10">Piloto en el podio (posición incorrecta) (Sprint)</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-yellow-400">{SCORING_RULES.sprintPodium.inPodium}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 f1-red-text">¿Cómo se Juega?</h1>
      <p className="text-center text-lg text-[var(--text-secondary)] mb-12">Todo lo que necesitas saber para convertirte en un campeón de BoxBox.</p>
      
      <div className="space-y-10">
        
        {/* Section 1: What is BoxBox? */}
        <section className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
          <h2 className="text-3xl font-bold mb-4">🏁 ¿Qué es BoxBox?</h2>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            BoxBox es un juego de predicción de Fórmula 1 donde pones a prueba tus conocimientos y tu intuición contra tus amigos y la comunidad. El objetivo es simple: predecir los resultados de cada Gran Premio y acumular la mayor cantidad de puntos posibles a lo largo de la temporada. ¿Crees que sabes quién hará la pole o quién subirá al podio? ¡Este es tu lugar para demostrarlo!
          </p>
        </section>

        {/* Section 2: How to predict */}
        <section className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
          <h2 className="text-3xl font-bold mb-4">🔮 Tu Misión: Predecir el Fin de Semana</h2>
          <div className="text-[var(--text-secondary)] leading-relaxed space-y-4">
            <p>
                Antes de que comience la acción en la pista para cada Gran Premio, tendrás la oportunidad de hacer tus predicciones. La página de <Link to="/" className="text-[var(--accent-blue)] font-semibold hover:underline">Predecir</Link> se habilitará para el próximo GP.
            </p>
            <p>Deberás predecir los siguientes resultados:</p>
            <ul className="list-none space-y-4 pl-4">
                <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                    <div><span className="font-semibold text-white">Pole Position (Clasificación Principal):</span> El piloto que logra el tiempo más rápido en la sesión de clasificación (Q3) y comienza la carrera del domingo en la primera posición.</div>
                </li>
                <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                    <div><span className="font-semibold text-white">Podio de la Carrera (P1, P2 y P3):</span> Los tres pilotos que terminan la carrera principal en primer, segundo y tercer lugar. ¡El orden importa!</div>
                </li>
                <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                    <div><span className="font-semibold text-white">Vuelta Rápida:</span> El piloto que consigue el tiempo de vuelta más rápido durante la carrera del domingo.</div>
                </li>
                <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                    <div><span className="font-semibold text-white">Piloto del Día:</span> El piloto votado por los fans como el mejor de la carrera, anunciado oficialmente al final de la transmisión.</div>
                </li>
            </ul>
             <p>En los fines de semana con <strong>formato Sprint</strong>, también deberás predecir:</p>
             <ul className="list-none space-y-4 pl-4">
                <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                    <div><span className="font-semibold text-white">Pole del Sprint:</span> El piloto que logra el tiempo más rápido en la clasificación específica para el Sprint (Sprint Shootout) y comienza el Sprint en primera posición.</div>
                </li>
                <li className="flex items-start">
                    <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                    <div><span className="font-semibold text-white">Podio del Sprint (P1, P2 y P3):</span> Los tres pilotos que terminan la carrera Sprint en primer, segundo y tercer lugar.</div>
                </li>
            </ul>
            <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-300 text-sm p-4 rounded-lg mt-4">
                <p className="font-bold">¡IMPORTANTE!</p>
                <p>Las predicciones se cierran automáticamente <strong>{LOCK_MINUTES_BEFORE} minutos antes</strong> del inicio de la sesión de clasificación (Qualifying). ¡No te quedes fuera!</p>
            </div>
          </div>
        </section>
        
        {/* Section 3: Scoring */}
        <section className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
            <h2 className="text-3xl font-bold mb-4">🏆 El Sistema de Puntos</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                Cada acierto te suma puntos. ¡La precisión es la clave! Aquí está el desglose de cómo se calcula tu puntuación en cada Gran Premio.
            </p>
            {renderScoringTable()}
            <p className="text-xs text-[var(--text-secondary)] mt-4 italic">
                Nota sobre el podio: Si aciertas un piloto que termina en el podio, pero en una posición diferente a la que predicjiste, sumas los puntos de "Piloto en el podio". Si aciertas la posición exacta, sumas los puntos correspondientes a P1, P2 o P3 (estos no se acumulan con los de "Piloto en el podio").
            </p>
        </section>

        {/* Section 4: Constructors Championship */}
        <section className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
          <h2 className="text-3xl font-bold mb-4">🏗️ Campeonato de Constructores</h2>
          <div className="text-[var(--text-secondary)] leading-relaxed space-y-4">
            <p>
              Además del campeonato individual de usuarios, también existe una tabla global de constructores.
            </p>
            <ul className="list-none space-y-4 pl-4">
              <li className="flex items-start">
                <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                <div><span className="font-semibold text-white">Conversión de puntos:</span> por cada <strong>10 puntos de predicción</strong> que sumas como usuario, aportas <strong>1 punto</strong> a tu escudería favorita.</div>
              </li>
              <li className="flex items-start">
                <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                <div><span className="font-semibold text-white">Qué puntos cuentan:</span> solo se consideran puntos de predicciones. Los ajustes manuales no aportan a constructores.</div>
              </li>
              <li className="flex items-start">
                <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                <div><span className="font-semibold text-white">Cambio de escudería:</span> si cambias tu equipo favorito, tus aportes nuevos empiezan a contar para el nuevo equipo desde ese momento.</div>
              </li>
              <li className="flex items-start">
                <ChevronRightIcon className="h-5 w-5 text-[var(--accent-red)] mr-2 flex-shrink-0 mt-1" />
                <div><span className="font-semibold text-white">Aporte mínimo:</span> nunca restas puntos; el aporte mínimo es 0.</div>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Tournaments & More */}
        <section className="bg-[var(--background-medium)] p-6 rounded-xl border border-[var(--border-color)]">
          <h2 className="text-3xl font-bold mb-4">🚀 Más Allá de la Pista</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[var(--text-secondary)]">
              <div className="bg-[var(--background-light)] p-4 rounded-lg">
                <h3 className="font-bold text-xl text-white mb-2">Torneos Privados</h3>
                <p>Crea o únete a torneos para competir directamente con tus amigos en una tabla de clasificación privada. ¡Demuestra quién es el que más sabe en tu grupo!</p>
              </div>
               <div className="bg-[var(--background-light)] p-4 rounded-lg">
                <h3 className="font-bold text-xl text-white mb-2">Perfiles y Toques</h3>
                <p>Personaliza tu avatar de piloto y revisa tus estadísticas. ¿Un amigo se olvidó de predecir? ¡Envíale un "toque" 👋 desde su perfil para recordárselo!</p>
              </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default HowToPlayPage;
