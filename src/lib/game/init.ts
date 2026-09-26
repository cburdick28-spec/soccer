import { nanoid } from "nanoid";
import { generateTeam, generateTeamFromSeed, generateTeamNames } from "./generate";
import { generatePyramidFixtures } from "./schedule";
import { autoLineup } from "./lineup";
import { Career, Player, Team } from "./types";
import { DIVISION_COUNT, DIVISION_SIZES } from "./divisions";
import { PREMIER_LEAGUE_CLUBS } from "./realData/premierLeague";

export const LEAGUE_SIZE = Object.values(DIVISION_SIZES).reduce((a, b) => a + b, 0); // 68 clubs

// Reputation (talent ceiling) ranges per FICTIONAL division tier (2-4). Division 1 is
// the real Premier League and derives its reputation from real player quality instead.
const DIVISION_REPUTATION_RANGE: Record<number, [number, number]> = {
  2: [55, 74],
  3: [42, 60],
  4: [30, 48],
};

function clubReputation(avgTier: number): number {
  return Math.max(40, Math.min(96, Math.round(50 + avgTier * 9)));
}

export function realClubNames(): string[] {
  return PREMIER_LEAGUE_CLUBS.map((c) => c.name);
}

export function createNewCareer(saveName: string, managerName: string, userTeamName: string, userDivision = 4): Career {
  const teams: Record<string, Team> = {};
  const players: Record<string, Player> = {};
  let userTeamId = "";

  // Division 1: the real Premier League — always present, regardless of where the
  // user starts, so climbing the pyramid means something.
  const divisionTeamIds: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const club of PREMIER_LEAGUE_CLUBS) {
    const avgTier = club.players.reduce((s, p) => s + p.tier, 0) / club.players.length;
    const reputation = clubReputation(avgTier);
    const isUser = userDivision === 1 && club.name.toLowerCase() === userTeamName.toLowerCase();
    const { team, players: squad } = generateTeamFromSeed(club, isUser, 1, reputation);
    teams[team.id] = team;
    squad.forEach((p) => (players[p.id] = p));
    divisionTeamIds[1].push(team.id);
    if (isUser) userTeamId = team.id;
  }

  // Divisions 2-4: procedurally generated fictional pyramid, as before.
  const names = generateTeamNames(DIVISION_SIZES[2] + DIVISION_SIZES[3] + DIVISION_SIZES[4]);
  let nameCursor = 0;

  for (const division of [2, 3, 4]) {
    const [lo, hi] = DIVISION_REPUTATION_RANGE[division];
    const size = DIVISION_SIZES[division];
    for (let i = 0; i < size; i++) {
      let name = names[nameCursor++];
      const isUser = userDivision === division && i === 0;
      if (isUser) name = userTeamName;
      const reputation = Math.round(hi - ((hi - lo) * i) / (size - 1) + (Math.random() * 6 - 3));
      const { team, players: squad } = generateTeam(name, isUser, Math.max(20, Math.min(95, reputation)), division);
      teams[team.id] = team;
      squad.forEach((p) => (players[p.id] = p));
      divisionTeamIds[division].push(team.id);
      if (isUser) userTeamId = team.id;
    }
  }

  // Fallback safety net in case name-matching above ever misses.
  if (!userTeamId) {
    const fallbackId = divisionTeamIds[userDivision][0];
    teams[fallbackId] = { ...teams[fallbackId], name: userTeamName, isUserTeam: true };
    userTeamId = fallbackId;
  }

  for (const tid of Object.keys(teams)) {
    const squad = Object.values(players).filter((p) => p.teamId === tid);
    const { lineup, subs } = autoLineup(teams[tid], squad);
    teams[tid] = { ...teams[tid], lineup, subs };
  }

  const fixtures = generatePyramidFixtures(divisionTeamIds, 1);

  return {
    id: nanoid(12),
    saveName,
    managerName,
    createdAt: Date.now(),
    userTeamId,
    season: 1,
    matchday: 1,
    teams,
    players,
    fixtures,
    freeAgentIds: [],
    transferOffers: [],
    news: [{
      id: nanoid(8),
      season: 1,
      matchday: 0,
      text: `${managerName} takes charge of ${teams[userTeamId].name} in Division ${userDivision}. Season 1 begins.`,
    }],
    seasonHistory: [],
    finances: { balance: 5_000_000 },
    version: 2,
  };
}

export function suggestedClubNames(): string[] {
  return generateTeamNames(DIVISION_COUNT * 16);
}
