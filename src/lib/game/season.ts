import { nanoid } from "nanoid";
import { Career, Player, TableRow } from "./types";
import { estimateValue, estimateWage, playerOverall } from "./ratings";
import { computeTable } from "./table";
import { generateDoubleRoundRobin } from "./schedule";
import { generatePlayer } from "./generate";
import { autoLineup } from "./lineup";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// Grow/decline attributes toward potential, then age up, then handle contracts.
export function developPlayer(p: Player): Player {
  const overall = playerOverall(p);
  const growthRoom = p.potential - overall;
  const keys = Object.keys(p.attributes) as (keyof typeof p.attributes)[];
  const next = { ...p.attributes };

  if (p.age <= 23 && growthRoom > 0) {
    for (const k of keys) next[k] = clamp(next[k] + Math.round(Math.random() * 4), 15, 95);
  } else if (p.age <= 29) {
    for (const k of keys) next[k] = clamp(next[k] + Math.round(Math.random() * 2 - 0.5), 15, 95);
  } else {
    const decline = p.age >= 33 ? 4 : p.age >= 31 ? 2 : 1;
    for (const k of keys) next[k] = clamp(next[k] - Math.round(Math.random() * decline), 15, 90);
  }

  const age = p.age + 1;
  const newOverall = playerOverall({ ...p, attributes: next });
  return {
    ...p,
    attributes: next,
    age,
    value: estimateValue(newOverall, age, p.potential),
    wage: p.wage, // wage stays until renewal
    contractYearsLeft: Math.max(0, p.contractYearsLeft - 1),
    condition: 100,
    morale: clamp(p.morale + Math.round(Math.random() * 10 - 5), 20, 100),
  };
}

export interface SeasonRolloverResult {
  career: Career;
  releasedPlayerIds: string[];
  retiredPlayerIds: string[];
}

export function rolloverSeason(career: Career): SeasonRolloverResult {
  const table = computeTable(Object.keys(career.teams), career.fixtures, career.season);
  const champion = career.teams[table[0]?.teamId]?.name ?? "Unknown";
  const userRow = table.findIndex((r) => r.teamId === career.userTeamId);
  const history = [...career.seasonHistory, {
    season: career.season,
    table,
    champion,
    userFinish: userRow + 1,
  }];

  const players = { ...career.players };
  const released: string[] = [];
  const retired: string[] = [];

  for (const id of Object.keys(players)) {
    let p = players[id];
    p = developPlayer(p);

    if (p.age >= 36 && Math.random() < 0.35) {
      retired.push(id);
      p = { ...p, teamId: null };
      delete players[id];
      continue;
    }

    if (p.contractYearsLeft <= 0) {
      if (p.teamId === career.userTeamId) {
        // leave for the user to decide via UI; give a short grace contract for now
        p.contractYearsLeft = 1;
      } else if (Math.random() < 0.55) {
        p.contractYearsLeft = 1 + Math.floor(Math.random() * 3);
        p.wage = estimateWage(playerOverall(p), p.age);
      } else {
        released.push(id);
        p.teamId = null;
      }
    }
    players[id] = p;
  }

  // Replenish free agent pool with a few fresh young players each season.
  const freeAgentIds = [...released];
  for (let i = 0; i < 6; i++) {
    const fresh = generatePlayer(55 + Math.round(Math.random() * 20));
    players[fresh.id] = fresh;
    freeAgentIds.push(fresh.id);
  }

  const nextSeason = career.season + 1;
  const teamIds = Object.keys(career.teams);
  const fixtures = generateDoubleRoundRobin(teamIds, nextSeason);

  const teams = { ...career.teams };
  for (const tid of teamIds) {
    const squad = Object.values(players).filter((p) => p.teamId === tid);
    const { lineup, subs } = autoLineup(teams[tid], squad);
    teams[tid] = { ...teams[tid], lineup, subs, transferBudget: teams[tid].transferBudget + Math.round(teams[tid].reputation * 4000) };
  }

  const news = [
    ...career.news,
    { id: nanoid(8), season: career.season, matchday: 999, text: `Season ${career.season} ends. ${champion} are champions!` },
    { id: nanoid(8), season: nextSeason, matchday: 0, text: `Season ${nextSeason} begins.` },
  ];

  return {
    career: {
      ...career,
      season: nextSeason,
      matchday: 1,
      players,
      teams,
      fixtures,
      freeAgentIds: Array.from(new Set([...career.freeAgentIds.filter((id) => players[id]), ...freeAgentIds])),
      transferOffers: [],
      seasonHistory: history,
      news,
    },
    releasedPlayerIds: released,
    retiredPlayerIds: retired,
  };
}

export function isSeasonComplete(career: Career): boolean {
  return career.fixtures.filter((f) => f.season === career.season).every((f) => f.played);
}

export function currentTable(career: Career): TableRow[] {
  return computeTable(Object.keys(career.teams), career.fixtures, career.season);
}
