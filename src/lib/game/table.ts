import { Fixture, TableRow } from "./types";

export function computeTable(teamIds: string[], fixtures: Fixture[], season: number): TableRow[] {
  const rows: Record<string, TableRow> = {};
  for (const id of teamIds) {
    rows[id] = { teamId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  }
  for (const f of fixtures) {
    if (f.season !== season || !f.played) continue;
    const home = rows[f.homeTeamId];
    const away = rows[f.awayTeamId];
    if (!home || !away) continue;
    home.played++; away.played++;
    home.gf += f.homeGoals; home.ga += f.awayGoals;
    away.gf += f.awayGoals; away.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { home.won++; away.lost++; home.points += 3; }
    else if (f.homeGoals < f.awayGoals) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
  }
  const list = Object.values(rows);
  for (const r of list) r.gd = r.gf - r.ga;
  list.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  return list;
}
