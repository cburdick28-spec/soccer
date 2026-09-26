import { nanoid } from "nanoid";
import {
  CITY_NAMES, CITY_PARTS, CLUB_SUFFIXES, FIRST_NAMES, LAST_NAMES, NATIONALITIES,
} from "./names";
import { Attributes, Formation, LineupSlot, Player, Position, Team } from "./types";
import { estimateValue, estimateWage, overallFor } from "./ratings";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateTeamNames(count: number): string[] {
  const names = new Set<string>();
  const cities = shuffle(CITY_NAMES);
  let idx = 0;
  while (names.size < count) {
    const usePart = Math.random() < 0.3;
    const city = cities[idx % cities.length];
    const full = usePart ? `${pick(CITY_PARTS)} ${city}` : city;
    const name = `${full} ${pick(CLUB_SUFFIXES)}`;
    names.add(name);
    idx++;
  }
  return Array.from(names);
}

const POSITION_POOL: { position: Position; weight: number }[] = [
  { position: "GK", weight: 2 },
  { position: "CB", weight: 4 },
  { position: "FB", weight: 4 },
  { position: "DM", weight: 2 },
  { position: "CM", weight: 4 },
  { position: "AM", weight: 2 },
  { position: "WG", weight: 3 },
  { position: "ST", weight: 3 },
];

function weightedPosition(): Position {
  const total = POSITION_POOL.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of POSITION_POOL) {
    if (r < p.weight) return p.position;
    r -= p.weight;
  }
  return "CM";
}

function baseAttributesFor(position: Position, skillLevel: number): Attributes {
  // skillLevel roughly 40-90, drives the mean of all attributes with position-specific bias.
  const n = () => Math.round(skillLevel + randInt(-10, 10));
  const boost = (base: number, amt: number) => Math.max(20, Math.min(95, base + amt));
  const a: Attributes = {
    pace: n(), shooting: n(), passing: n(), dribbling: n(), defending: n(), physical: n(), goalkeeping: 30,
  };
  switch (position) {
    case "GK":
      a.goalkeeping = boost(skillLevel, randInt(5, 15));
      a.pace = boost(a.pace, -20);
      a.shooting = boost(a.shooting, -30);
      a.defending = boost(a.defending, -10);
      break;
    case "CB":
      a.defending = boost(a.defending, randInt(5, 12));
      a.physical = boost(a.physical, randInt(2, 10));
      a.pace = boost(a.pace, -5);
      a.shooting = boost(a.shooting, -10);
      break;
    case "FB":
      a.defending = boost(a.defending, randInt(2, 8));
      a.pace = boost(a.pace, randInt(2, 10));
      break;
    case "DM":
      a.defending = boost(a.defending, randInt(2, 10));
      a.passing = boost(a.passing, randInt(2, 8));
      break;
    case "CM":
      a.passing = boost(a.passing, randInt(3, 10));
      a.dribbling = boost(a.dribbling, randInt(0, 6));
      break;
    case "AM":
      a.passing = boost(a.passing, randInt(3, 10));
      a.dribbling = boost(a.dribbling, randInt(3, 10));
      a.shooting = boost(a.shooting, randInt(0, 8));
      break;
    case "WG":
      a.pace = boost(a.pace, randInt(4, 12));
      a.dribbling = boost(a.dribbling, randInt(4, 12));
      break;
    case "ST":
      a.shooting = boost(a.shooting, randInt(5, 14));
      a.pace = boost(a.pace, randInt(0, 8));
      break;
  }
  for (const k of Object.keys(a) as (keyof Attributes)[]) {
    a[k] = Math.max(15, Math.min(95, Math.round(a[k])));
  }
  return a;
}

export function generatePlayer(teamStrength: number, forcePosition?: Position): Player {
  const position = forcePosition ?? weightedPosition();
  const age = randInt(17, 34);
  const skillLevel = Math.max(35, Math.min(88, teamStrength + randInt(-8, 8)));
  const attributes = baseAttributesFor(position, skillLevel);
  const overall = overallFor(position, attributes);
  const youthBonus = age < 23 ? randInt(3, 20) : age < 27 ? randInt(0, 8) : 0;
  const potential = Math.max(overall, Math.min(94, overall + youthBonus - (age > 29 ? 5 : 0)));
  const secondary: Position[] = [];
  if (position === "FB" && Math.random() < 0.3) secondary.push("CB");
  if (position === "WG" && Math.random() < 0.3) secondary.push("ST");
  if (position === "CM" && Math.random() < 0.3) secondary.push(Math.random() < 0.5 ? "DM" : "AM");
  return {
    id: nanoid(10),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    age,
    nationality: pick(NATIONALITIES),
    position,
    secondaryPositions: secondary,
    attributes,
    potential,
    condition: 100,
    morale: randInt(60, 90),
    injuryWeeksLeft: 0,
    teamId: null,
    contractYearsLeft: randInt(1, 4),
    wage: estimateWage(overall, age),
    value: estimateValue(overall, age, potential),
    history: [],
  };
}

const SQUAD_TEMPLATE: Position[] = [
  "GK", "GK",
  "CB", "CB", "CB", "FB", "FB",
  "DM", "CM", "CM", "AM",
  "WG", "WG", "ST", "ST",
  // depth
  "CB", "FB", "CM", "WG", "ST",
];

export function generateSquad(teamStrength: number): Player[] {
  return SQUAD_TEMPLATE.map((pos) => generatePlayer(teamStrength, pos));
}

export function defaultLineupForFormation(formation: Formation): LineupSlot[] {
  const templates: Record<Formation, Position[]> = {
    "4-4-2": ["GK", "FB", "CB", "CB", "FB", "WG", "CM", "CM", "WG", "ST", "ST"],
    "4-3-3": ["GK", "FB", "CB", "CB", "FB", "CM", "CM", "AM", "WG", "ST", "WG"],
    "3-5-2": ["GK", "CB", "CB", "CB", "FB", "CM", "CM", "CM", "FB", "ST", "ST"],
    "4-2-3-1": ["GK", "FB", "CB", "CB", "FB", "DM", "DM", "AM", "WG", "WG", "ST"],
  };
  return templates[formation].map((slot) => ({ slot, playerId: null }));
}

export function generateTeam(name: string, isUserTeam: boolean, reputation: number): { team: Team; players: Player[] } {
  const short = name.split(" ").slice(0, 2).join(" ").slice(0, 12);
  const players = generateSquad(reputation);
  const team: Team = {
    id: nanoid(10),
    name,
    shortName: short,
    primaryColor: pick(["#1d4ed8", "#b91c1c", "#15803d", "#7c3aed", "#c2410c", "#0e7490", "#4d7c0f", "#a21caf", "#0f172a", "#be123c"]),
    secondaryColor: "#ffffff",
    reputation,
    transferBudget: Math.round(reputation * randInt(8000, 15000) / 1000) * 1000,
    wageBudget: Math.round(reputation * randInt(400, 700) / 10) * 10,
    formation: "4-3-3",
    lineup: defaultLineupForFormation("4-3-3"),
    subs: [],
    isUserTeam,
  };
  players.forEach((p) => (p.teamId = team.id));
  return { team, players };
}
