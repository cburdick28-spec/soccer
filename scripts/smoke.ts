import { createNewCareer } from "../src/lib/game/init";
import { simulateMatch, applyResultToFixture } from "../src/lib/game/matchEngine";
import { autoLineup } from "../src/lib/game/lineup";
import { isSeasonComplete, rolloverSeason, currentTable } from "../src/lib/game/season";
import { generateIncomingOffers } from "../src/lib/game/transfers";

let career = createNewCareer("Smoke Test", "Test Manager", "Highford United");
console.log("Teams:", Object.keys(career.teams).length, "Players:", Object.keys(career.players).length);
console.log("Fixtures season 1:", career.fixtures.filter((f) => f.season === 1).length);

for (let season = 1; season <= 3; season++) {
  let matchday = 1;
  let guard = 0;
  while (!isSeasonComplete(career) && guard < 60) {
    const md = career.matchday;
    const todays = career.fixtures.filter((f) => f.season === career.season && f.matchday === md && !f.played);
    let fixtures = [...career.fixtures];
    let players = { ...career.players };
    let teams = { ...career.teams };
    for (const fixture of todays) {
      const home = teams[fixture.homeTeamId];
      const away = teams[fixture.awayTeamId];
      if (!home || !away) continue;
      const hp = Object.values(players).filter((p) => p.teamId === home.id);
      const ap = Object.values(players).filter((p) => p.teamId === away.id);
      teams[home.id] = { ...home, ...autoLineup(home, hp) };
      teams[away.id] = { ...away, ...autoLineup(away, ap) };
      const result = simulateMatch(teams[home.id], teams[away.id], players);
      const idx = fixtures.findIndex((f) => f.id === fixture.id);
      fixtures[idx] = applyResultToFixture(fixture, result);
      for (const [pid, delta] of Object.entries(result.conditionDelta)) {
        const p = players[pid];
        if (p) players[pid] = { ...p, condition: Math.max(10, Math.min(100, p.condition + delta)) };
      }
      for (const inj of result.injuries) {
        const p = players[inj.playerId];
        if (p) players[inj.playerId] = { ...p, injuryWeeksLeft: Math.max(p.injuryWeeksLeft, inj.weeks) };
      }
      if (result.homeGoals > 15 || result.awayGoals > 15) {
        throw new Error(`Unrealistic scoreline ${result.homeGoals}-${result.awayGoals}`);
      }
    }
    career = { ...career, fixtures, players, teams, matchday: md + 1 };
    career = generateIncomingOffers(career);
    guard++;
  }
  const table = currentTable(career);
  console.log(`Season ${career.season} final table top3:`, table.slice(0, 3).map((r) => `${career.teams[r.teamId].name}(${r.points})`));
  if (!isSeasonComplete(career)) throw new Error("Season did not complete within guard limit");
  const { career: nextCareer, releasedPlayerIds, retiredPlayerIds } = rolloverSeason(career);
  console.log(`Rolled over to season ${nextCareer.season}. Released: ${releasedPlayerIds.length}, Retired: ${retiredPlayerIds.length}, total players: ${Object.keys(nextCareer.players).length}`);
  career = nextCareer;
}

console.log("SMOKE TEST PASSED");
