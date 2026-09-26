import { nanoid } from "nanoid";
import { generateTeam, generateTeamNames } from "./generate";
import { generateDoubleRoundRobin } from "./schedule";
import { autoLineup } from "./lineup";
import { Career, Player, Team } from "./types";

export const LEAGUE_SIZE = 16;

export function createNewCareer(saveName: string, managerName: string, userTeamName: string): Career {
  const names = generateTeamNames(LEAGUE_SIZE);
  // ensure the chosen user club name is included and unique
  const idx = names.findIndex((n) => n.toLowerCase() === userTeamName.toLowerCase());
  if (idx === -1) names[0] = userTeamName;
  else { const tmp = names[0]; names[0] = names[idx]; names[idx] = tmp; }

  const teams: Record<string, Team> = {};
  const players: Record<string, Player> = {};
  let userTeamId = "";

  names.forEach((name, i) => {
    const isUser = i === 0;
    const reputation = isUser ? 60 : Math.max(35, Math.min(90, 75 - i * 2 + Math.round(Math.random() * 10)));
    const { team, players: squad } = generateTeam(name, isUser, reputation);
    teams[team.id] = team;
    squad.forEach((p) => (players[p.id] = p));
    if (isUser) userTeamId = team.id;
  });

  for (const tid of Object.keys(teams)) {
    const squad = Object.values(players).filter((p) => p.teamId === tid);
    const { lineup, subs } = autoLineup(teams[tid], squad);
    teams[tid] = { ...teams[tid], lineup, subs };
  }

  const fixtures = generateDoubleRoundRobin(Object.keys(teams), 1);

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
    news: [{ id: nanoid(8), season: 1, matchday: 0, text: `${managerName} takes charge of ${teams[userTeamId].name}. Season 1 begins.` }],
    seasonHistory: [],
    finances: { balance: 5_000_000 },
  };
}

export function suggestedClubNames(): string[] {
  return generateTeamNames(LEAGUE_SIZE);
}
