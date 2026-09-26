import { nanoid } from "nanoid";
import { Career, DivisionHistoryEntry, Player, SeasonHistoryEntry, Team } from "./types";
import { estimateValue, estimateWage, overallFor, playerOverall } from "./ratings";
import { computeTable } from "./table";
import { generatePyramidFixtures } from "./schedule";
import { generatePlayer } from "./generate";
import { autoLineup } from "./lineup";
import { DIVISION_COUNT, PROMOTE_RELEGATE_COUNT, teamIdsInDivision } from "./divisions";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// Grow/decline attributes toward potential, then age up.
export function developPlayer(p: Player): Player {
  const overall = playerOverall(p);
  const growthRoom = p.potentialRating - overall;
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
  const newOverall = overallFor(p.position, next);
  return {
    ...p,
    attributes: next,
    currentRating: newOverall,
    age,
    marketValue: estimateValue(newOverall, age, p.potentialRating),
    contractYears: Math.max(0, p.contractYears - 1),
    condition: 100,
    matchForm: [],
    morale: clamp(p.morale + Math.round(Math.random() * 10 - 5), 20, 100),
  };
}

export interface SeasonRolloverResult {
  career: Career;
  releasedPlayerIds: string[];
  retiredPlayerIds: string[];
  regenPlayerIds: string[];
  promotions: Record<number, string[]>;
  relegations: Record<number, string[]>;
}

export function rolloverSeason(career: Career): SeasonRolloverResult {
  const divisionHistories: DivisionHistoryEntry[] = [];
  const promotions: Record<number, string[]> = {};
  const relegations: Record<number, string[]> = {};
  let userDivisionFinish = 0;
  let userDivision = career.teams[career.userTeamId].divisionId;

  for (let d = 1; d <= DIVISION_COUNT; d++) {
    const teamIds = teamIdsInDivision(career, d);
    const table = computeTable(teamIds, career.fixtures, career.season, d);
    const champion = career.teams[table[0]?.teamId]?.name ?? "Unknown";
    const promoted = d > 1 ? table.slice(0, PROMOTE_RELEGATE_COUNT).map((r) => r.teamId) : [];
    const relegated = d < DIVISION_COUNT ? table.slice(-PROMOTE_RELEGATE_COUNT).map((r) => r.teamId) : [];
    promotions[d] = promoted;
    relegations[d] = relegated;
    divisionHistories.push({ divisionId: d, table, champion, promoted, relegated });
    if (d === userDivision) {
      userDivisionFinish = table.findIndex((r) => r.teamId === career.userTeamId) + 1;
    }
  }

  const history: SeasonHistoryEntry = {
    season: career.season,
    divisions: divisionHistories,
    userDivision,
    userFinish: userDivisionFinish,
  };

  // Apply promotion/relegation swaps: teams promoted from d move to d-1, relegated from d move to d+1.
  const teams = { ...career.teams };
  for (let d = 1; d <= DIVISION_COUNT; d++) {
    for (const id of promotions[d] ?? []) {
      if (d > 1) teams[id] = { ...teams[id], divisionId: d - 1 };
    }
    for (const id of relegations[d] ?? []) {
      if (d < DIVISION_COUNT) teams[id] = { ...teams[id], divisionId: d + 1 };
    }
  }

  const players = { ...career.players };
  const released: string[] = [];
  const retired: string[] = [];
  const regens: string[] = [];

  for (const id of Object.keys(players)) {
    let p = players[id];
    p = developPlayer(p);

    if (p.age >= 36 && Math.random() < 0.35) {
      retired.push(id);
      delete players[id];
      continue;
    }

    if (p.contractYears <= 0) {
      if (p.teamId === career.userTeamId) {
        p.contractYears = 1; // grace period; user decides via Squad UI
      } else if (Math.random() < 0.55) {
        p.contractYears = 1 + Math.floor(Math.random() * 3);
        p.wage = estimateWage(p.currentRating, p.age);
      } else {
        released.push(id);
        p.teamId = null;
      }
    }
    players[id] = p;
  }

  // Youth regens: each club has a chance of producing a 16-year-old academy prospect.
  const freeAgentIds = [...released];
  for (const tid of Object.keys(teams)) {
    if (Math.random() < 0.4) {
      const team = teams[tid];
      const regen = generatePlayer(team.reputation, undefined, true);
      regen.teamId = tid;
      players[regen.id] = regen;
      regens.push(regen.id);
    }
  }
  // Replenish free agent pool with a few extra prospects each season.
  for (let i = 0; i < 6; i++) {
    const fresh = generatePlayer(55 + Math.round(Math.random() * 20));
    players[fresh.id] = fresh;
    freeAgentIds.push(fresh.id);
  }

  const nextSeason = career.season + 1;
  const divisionTeamIds: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const t of Object.values(teams)) divisionTeamIds[t.divisionId]?.push(t.id);
  const fixtures = generatePyramidFixtures(divisionTeamIds, nextSeason);

  for (const tid of Object.keys(teams)) {
    const squad = Object.values(players).filter((p) => p.teamId === tid);
    const { lineup, subs } = autoLineup(teams[tid], squad);
    teams[tid] = { ...teams[tid], lineup, subs, transferBudget: teams[tid].transferBudget + Math.round(teams[tid].reputation * 4000) };
  }

  const promotedNames = (promotions[userDivision] ?? []).map((id) => career.teams[id]?.name);
  const relegatedNames = (relegations[userDivision] ?? []).map((id) => career.teams[id]?.name);
  const newUserDivision = teams[career.userTeamId].divisionId;
  const news = [
    ...career.news,
    { id: nanoid(8), season: career.season, matchday: 999, text: `Season ${career.season} ends.` },
    ...(promotedNames.length ? [{ id: nanoid(8), season: career.season, matchday: 999, text: `Promoted from Division ${userDivision}: ${promotedNames.join(", ")}` }] : []),
    ...(relegatedNames.length ? [{ id: nanoid(8), season: career.season, matchday: 999, text: `Relegated from Division ${userDivision}: ${relegatedNames.join(", ")}` }] : []),
    { id: nanoid(8), season: nextSeason, matchday: 0, text: `Season ${nextSeason} begins. ${teams[career.userTeamId].name} play in Division ${newUserDivision}.` },
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
      transferOffers: career.transferOffers.filter((o) => o.stage !== "Completed" && o.stage !== "Rejected"),
      seasonHistory: [...career.seasonHistory, history],
      news,
    },
    releasedPlayerIds: released,
    retiredPlayerIds: retired,
    regenPlayerIds: regens,
    promotions,
    relegations,
  };
}

export function isSeasonComplete(career: Career): boolean {
  return career.fixtures.filter((f) => f.season === career.season).every((f) => f.played);
}

export function currentTable(career: Career, divisionId?: number): import("./types").TableRow[] {
  const div = divisionId ?? career.teams[career.userTeamId].divisionId;
  return computeTable(teamIdsInDivision(career, div), career.fixtures, career.season, div);
}
