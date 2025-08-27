import { Team, Driver, GrandPrix, Achievement, AchievementId } from './types';

export const APP_NAME = "BoxBox";

export const SCORING_RULES = {
  pole: 10,
  fastestLap: 8,
  driverOfTheDay: 6,
  racePodium: {
    p1: 15,
    p2: 10,
    p3: 7,
    inPodium: 5,
  },
  sprintPole: 5,
  sprintPodium: {
    p1: 8,
    p2: 5,
    p3: 3,
    inPodium: 2,
  },
};

export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  driver_of_the_weekend: { id: 'driver_of_the_weekend', name: 'Piloto del Fin de Semana', description: 'Logró la puntuación más alta en un Gran Premio.', icon: '🏆' },
  hat_trick: { id: 'hat_trick', name: 'Hat-Trick', description: 'Acertó Pole, P1 y Vuelta Rápida en una misma carrera.', icon: '🎩' },
  podio_perfecto: { id: 'podio_perfecto', name: 'Podio Perfecto', description: 'Acertó los 3 puestos del podio en orden exacto.', icon: '✨' },
  nostradamus: { id: 'nostradamus', name: 'Nostradamus', description: 'Acertó 5 o más resultados en un mismo GP.', icon: '🔮' },
  creador_de_ligas: { id: 'creador_de_ligas', name: 'Creador de Ligas', description: 'Creó su primer torneo.', icon: '🤝' },
  veterano: { id: 'veterano', name: 'Veterano', description: 'Ha participado en 10 o más Grandes Premios.', icon: '🏅' },
};


export const LOCK_MINUTES_BEFORE = 5;

// Data for the one-time database seed
export const TEAMS: Team[] = [
  { id: 'mercedes', name: 'Mercedes-AMG Petronas', color: 'bg-[#6CD3BF]' },
  { id: 'red_bull', name: 'Oracle Red Bull Racing', color: 'bg-[#3671C6]' },
  { id: 'ferrari', name: 'Scuderia Ferrari', color: 'bg-[#F91536]' },
  { id: 'mclaren', name: 'McLaren Formula 1 Team', color: 'bg-[#F58020]' },
  { id: 'aston_martin', name: 'Aston Martin Aramco', color: 'bg-[#358C75]' },
  { id: 'alpine', name: 'BWT Alpine F1 Team', color: 'bg-[#2293D1]' },
  { id: 'williams', name: 'Williams Racing', color: 'bg-[#37BEDD]' },
  { id: 'rb', name: 'Visa Cash App RB', color: 'bg-[#6692FF]' },
  { id: 'sauber', name: 'Stake F1 Team Kick Sauber', color: 'bg-[#52E252]' },
  { id: 'haas', name: 'MoneyGram Haas F1 Team', color: 'bg-[#B6BABD]' },
];

export const DRIVERS: Driver[] = [
  { id: 'hamilton', name: 'Lewis Hamilton', teamId: 'ferrari', isActive: true },
  { id: 'leclerc', name: 'Charles Leclerc', teamId: 'ferrari', isActive: true },
  { id: 'verstappen', name: 'Max Verstappen', teamId: 'red_bull', isActive: true },
  { id: 'perez', name: 'Sergio Pérez', teamId: 'red_bull', isActive: true },
  { id: 'russell', name: 'George Russell', teamId: 'mercedes', isActive: true },
  { id: 'antonelli', name: 'Andrea Kimi Antonelli', teamId: 'mercedes', isActive: true },
  { id: 'norris', name: 'Lando Norris', teamId: 'mclaren', isActive: true },
  { id: 'piastri', name: 'Oscar Piastri', teamId: 'mclaren', isActive: true },
  { id: 'alonso', name: 'Fernando Alonso', teamId: 'aston_martin', isActive: true },
  { id: 'stroll', name: 'Lance Stroll', teamId: 'aston_martin', isActive: true },
  { id: 'gasly', name: 'Pierre Gasly', teamId: 'alpine', isActive: true },
  { id: 'doohan', name: 'Jack Doohan', teamId: 'alpine', isActive: true },
  { id: 'albon', name: 'Alexander Albon', teamId: 'williams', isActive: true },
  { id: 'sainz', name: 'Carlos Sainz', teamId: 'williams', isActive: true },
  { id: 'tsunoda', name: 'Yuki Tsunoda', teamId: 'rb', isActive: true },
  { id: 'ricciardo', name: 'Daniel Ricciardo', teamId: 'rb', isActive: false },
  { id: 'lawson', name: 'Liam Lawson', teamId: 'rb', isActive: true },
  { id: 'hulkenberg', name: 'Nico Hülkenberg', teamId: 'sauber', isActive: true },
  { id: 'bottas', name: 'Valtteri Bottas', teamId: 'sauber', isActive: false },
  { id: 'bearman', name: 'Oliver Bearman', teamId: 'haas', isActive: true },
  { id: 'ocon', name: 'Esteban Ocon', teamId: 'haas', isActive: true },
  { id: 'magnussen', name: 'Kevin Magnussen', teamId: 'haas', isActive: false },
  { id: 'sargeant', name: 'Logan Sargeant', teamId: 'williams', isActive: false },
  { id: 'zhou', name: 'Guanyu Zhou', teamId: 'sauber', isActive: false },
  { id: 'colapinto', name: 'Franco Colapinto', teamId: 'williams', isActive: false },
];


export const GP_SCHEDULE: GrandPrix[] = [
    { id: 1, name: "Australian Grand Prix", country: "Australia", track: "Albert Park", hasSprint: false, events: { quali: "2025-03-15T05:00:00Z", race: "2025-03-16T04:00:00Z" } },
    { id: 2, name: "Chinese Grand Prix", country: "China", track: "Shanghai International Circuit", hasSprint: true, events: { quali: "2025-03-22T07:00:00Z", sprint: "2025-03-22T03:00:00Z", race: "2025-03-23T07:00:00Z" } },
    { id: 3, name: "Japanese Grand Prix", country: "Japan", track: "Suzuka Circuit", hasSprint: false, events: { quali: "2025-04-05T06:00:00Z", race: "2025-04-06T05:00:00Z" } },
    { id: 4, name: "Bahrain Grand Prix", country: "Bahrain", track: "Bahrain International Circuit", hasSprint: false, events: { quali: "2025-04-12T15:00:00Z", race: "2025-04-13T15:00:00Z" } },
    { id: 5, name: "Saudi Arabian Grand Prix", country: "Saudi Arabia", track: "Jeddah Corniche Circuit", hasSprint: false, events: { quali: "2025-04-19T17:00:00Z", race: "2025-04-20T17:00:00Z" } },
    { id: 6, name: "Miami Grand Prix", country: "USA", track: "Miami International Autodrome", hasSprint: true, events: { quali: "2025-05-03T20:00:00Z", sprint: "2025-05-03T16:00:00Z", race: "2025-05-04T19:30:00Z" } },
    { id: 7, name: "Emilia Romagna Grand Prix", country: "Italy", track: "Imola Circuit", hasSprint: false, events: { quali: "2025-05-17T14:00:00Z", race: "2025-05-18T13:00:00Z" } },
    { id: 8, name: "Monaco Grand Prix", country: "Monaco", track: "Circuit de Monaco", hasSprint: false, events: { quali: "2025-05-24T14:00:00Z", race: "2025-05-25T13:00:00Z" } },
    { id: 9, name: "Spanish Grand Prix", country: "Spain", track: "Circuit de Barcelona-Catalunya", hasSprint: false, events: { quali: "2025-05-31T14:00:00Z", race: "2025-06-01T13:00:00Z" } },
    { id: 10, name: "Canadian Grand Prix", country: "Canada", track: "Circuit Gilles Villeneuve", hasSprint: false, events: { quali: "2025-06-14T20:00:00Z", race: "2025-06-15T18:00:00Z" } },
    { id: 11, name: "Austrian Grand Prix", country: "Austria", track: "Red Bull Ring", hasSprint: true, events: { quali: "2025-06-28T14:00:00Z", sprint: "2025-06-28T10:30:00Z", race: "2025-06-29T13:00:00Z" } },
    { id: 12, name: "British Grand Prix", country: "UK", track: "Silverstone Circuit", hasSprint: false, events: { quali: "2025-07-05T14:00:00Z", race: "2025-07-06T14:00:00Z" } },
    { id: 13, name: "Belgian Grand Prix", country: "Belgium", track: "Circuit de Spa-Francorchamps", hasSprint: true, events: { quali: "2025-07-26T14:00:00Z", sprint: "2025-07-26T10:30:00Z", race: "2025-07-27T13:00:00Z" } },
    { id: 14, name: "Hungarian Grand Prix", country: "Hungary", track: "Hungaroring", hasSprint: false, events: { quali: "2025-08-02T14:00:00Z", race: "2025-08-03T13:00:00Z" } },
    { id: 15, name: "Dutch Grand Prix", country: "Netherlands", track: "Zandvoort", hasSprint: false, events: { quali: "2025-08-30T13:00:00Z", race: "2025-08-31T13:00:00Z" } },
    { id: 16, name: "Italian Grand Prix", country: "Italy", track: "Monza", hasSprint: false, events: { quali: "2025-09-06T14:00:00Z", race: "2025-09-07T13:00:00Z" } },
    { id: 17, name: "Azerbaijan Grand Prix", country: "Azerbaijan", track: "Baku City Circuit", hasSprint: false, events: { quali: "2025-09-20T12:00:00Z", race: "2025-09-21T11:00:00Z" } },
    { id: 18, name: "Singapore Grand Prix", country: "Singapore", track: "Marina Bay Street Circuit", hasSprint: false, events: { quali: "2025-10-04T13:00:00Z", race: "2025-10-05T12:00:00Z" } },
    { id: 19, name: "United States Grand Prix", country: "USA", track: "Circuit of the Americas", hasSprint: true, events: { quali: "2025-10-18T22:00:00Z", sprint: "2025-10-18T18:00:00Z", race: "2025-10-19T19:00:00Z" } },
    { id: 20, name: "Mexico City Grand Prix", country: "Mexico", track: "Autódromo Hermanos Rodríguez", hasSprint: false, events: { quali: "2025-10-25T21:00:00Z", race: "2025-10-26T20:00:00Z" } },
    { id: 21, name: "Brazilian Grand Prix", country: "Brazil", track: "Interlagos", hasSprint: true, events: { quali: "2025-11-08T19:00:00Z", sprint: "2025-11-08T15:30:00Z", race: "2025-11-09T18:00:00Z" } },
    { id: 22, name: "Las Vegas Grand Prix", country: "USA", track: "Las Vegas Strip Circuit", hasSprint: false, events: { quali: "2025-11-22T06:00:00Z", race: "2025-11-23T06:00:00Z" } },
    { id: 23, name: "Qatar Grand Prix", country: "Qatar", track: "Lusail International Circuit", hasSprint: true, events: { quali: "2025-11-29T15:00:00Z", sprint: "2025-11-29T10:30:00Z", race: "2025-11-30T15:00:00Z" } },
    { id: 24, name: "Abu Dhabi Grand Prix", country: "UAE", track: "Yas Marina Circuit", hasSprint: false, events: { quali: "2025-12-06T14:00:00Z", race: "2025-12-07T13:00:00Z" } },
];