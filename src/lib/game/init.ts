import { nanoid } from "nanoid";
import { generateTeam, generateTeamNames } from "./generate";
import { generatePyramidFixtures } from "./schedule";
import { autoLineup } from "./lineup";
import { Career, Player, Team } from "./types";
import { DIVISION_COUNT, TEAMS_PER_DIVISION } from "./divisions";

export const LEAGUE_SIZE = DIVISION_COUNT * TEAMS_PER_DIVISION; // 64 clubs

// Reputation (talent ceiling) ranges per division tier — top tier strongest.
const DIVISION_REPUTATION_RANGE: Record<number, [number, number]> = {
  1: [70, 92],
  2: [55, 74],
  3: [42, 60],
  4: [30, 48],
};

export function createNewCareer(saveName: string, managerName: string, userTeamName: string, userDivision = 4): Career {
  const names = generateTeamNames(LEAGUE_SIZE);
  const idx = names.findIndex((n) => n.toLowerCase() === userTeamName.toLowerCase());
  if (idx === -1) names[0] = userTeamName;
  else { const tmp = names[0]; names[0] = names[idx]; names[idx] = tmp; }

  const teams: Record<string, Team> = {};
  const players: Record<string, Player> = {};
  let userTeamId = "";
  const divisionTeamIds: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };

  let nameCursor = 0;
  for (let division = 1; division <= DIVISION_COUNT; division++) {
    const [lo, hi] = DIVISION_REPUTATION_RANGE[division];
    for (let i = 0; i < TEAMS_PER_DIVISION; i++) {
      const name = names[nameCursor++];
      const isUser = division === userDivision && i === 0 && name.toLowerCase() === userTeamName.toLowerCase();
      // spread reputation across the division, strongest teams first
      const reputation = Math.round(hi - ((hi - lo) * i) / (TEAMS_PER_DIVISION - 1) + (Math.random() * 6 - 3));
      const { team, players: squad } = generateTeam(name, isUser, Math.max(20, Math.min(95, reputation)), division);
      teams[team.id] = team;
      squad.forEach((p) => (players[p.id] = p));
      divisionTeamIds[division].push(team.id);
      if (isUser) userTeamId = team.id;
    }
  }

  // Fallback: guarantee the user's club exists even if name matching above missed.
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
  return generateTeamNames(TEAMS_PER_DIVISION);
}
