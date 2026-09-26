// Core data model for the career-mode football sim.

export type Position = "GK" | "CB" | "FB" | "DM" | "CM" | "AM" | "WG" | "ST";

export interface Attributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: Position;
  secondaryPositions: Position[];
  attributes: Attributes;
  potential: number; // 0-99 ceiling for overall growth
  condition: number; // 0-100 current fitness
  morale: number; // 0-100
  injuryWeeksLeft: number; // 0 = fit
  teamId: string | null; // null = free agent
  contractYearsLeft: number;
  wage: number; // per season
  value: number; // market value
  history: { season: number; apps: number; goals: number; assists: number }[];
  listedForTransfer?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  reputation: number; // 0-100, affects AI transfer ambition/wage budget
  transferBudget: number;
  wageBudget: number;
  formation: Formation;
  lineup: LineupSlot[]; // starting XI assignment for this team's next match
  subs: string[]; // bench player ids, in priority order
  isUserTeam: boolean;
}

export type Formation = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1";

export interface LineupSlot {
  slot: Position;
  playerId: string | null;
}

export interface MatchEvent {
  minute: number;
  type: "goal" | "injury" | "card" | "note";
  teamId: string;
  playerId?: string;
  text: string;
}

export interface Fixture {
  id: string;
  season: number;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
}

export interface TableRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface TransferOffer {
  id: string;
  playerId: string;
  fromTeamId: string | null; // null when buying from free agents
  toTeamId: string;
  amount: number;
  wage: number;
  status: "pending" | "accepted" | "rejected";
  direction: "incoming" | "outgoing"; // relative to user team
}

export interface NewsItem {
  id: string;
  season: number;
  matchday: number;
  text: string;
}

export interface SeasonHistoryEntry {
  season: number;
  table: TableRow[];
  champion: string;
  userFinish: number;
}

export interface Career {
  id: string;
  saveName: string;
  managerName: string;
  createdAt: number;
  userTeamId: string;
  season: number;
  matchday: number; // 1-indexed next matchday to be played
  teams: Record<string, Team>;
  players: Record<string, Player>;
  fixtures: Fixture[];
  freeAgentIds: string[];
  transferOffers: TransferOffer[];
  news: NewsItem[];
  seasonHistory: SeasonHistoryEntry[];
  finances: { balance: number };
}
