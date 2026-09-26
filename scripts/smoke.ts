import { createNewCareer } from "../src/lib/game/init";
import { simulateMatch, applyResultToFixture } from "../src/lib/game/matchEngine";
import { autoLineup } from "../src/lib/game/lineup";
import { isSeasonComplete, rolloverSeason, currentTable } from "../src/lib/game/season";
import { processWeeklyTransferActivity, submitBid, respondToOutgoingOffer } from "../src/lib/game/transfers";
import { Career } from "../src/lib/game/types";
import { divisionName } from "../src/lib/game/divisions";

let career: Career = createNewCareer("Smoke Test", "Test Manager", "Highford United", 4);
console.log("Teams:", Object.keys(career.teams).length, "Players:", Object.keys(career.players).length);
console.log("Fixtures season 1:", career.fixtures.filter((f) => f.season === 1).length);
console.log("User plays in", divisionName(career.teams[career.userTeamId].divisionId));

// exercise a transfer bid + negotiation flow once, headlessly
{
  const target = Object.values(career.players).find((p) => p.teamId && p.teamId !== career.userTeamId && p.position === "ST");
  if (target) {
    career = submitBid(career, target.id, Math.round(target.marketValue * 1.4));
    career = processWeeklyTransferActivity(career);
    const offer = career.transferOffers.find((o) => o.playerId === target.id);
    console.log("Transfer offer stage after AI review:", offer?.stage, offer?.log.slice(-1));
    if (offer && offer.stage === "Contract_Negotiation") {
      career = respondToOutgoingOffer(career, offer.id, "accept");
      const after = career.transferOffers.find((o) => o.id === offer.id);
      console.log("Transfer offer stage after accepting terms:", after?.stage, "New team:", career.players[target.id]?.teamId === career.userTeamId);
    }
  }
}

for (let season = 1; season <= 6; season++) {
  let guard = 0;
  const userDivBefore = career.teams[career.userTeamId].divisionId;
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
        if (p) players[inj.playerId] = { ...p, injuryWeeks: Math.max(p.injuryWeeks, inj.weeks) };
      }
      if (result.homeGoals > 15 || result.awayGoals > 15) {
        throw new Error(`Unrealistic scoreline ${result.homeGoals}-${result.awayGoals}`);
      }
      // sanity: xG stats & coordinates present
      if (result.stats.cumulativeXg.length !== 90) throw new Error("cumulativeXg should have 90 entries");
      for (const ev of result.events) {
        if ((ev.type === "goal" || ev.type === "shot") && !ev.coordinate) throw new Error("shot/goal event missing coordinate");
      }
    }
    career = { ...career, fixtures, players, teams, matchday: md + 1 };
    career = processWeeklyTransferActivity(career);
    guard++;
  }
  if (!isSeasonComplete(career)) throw new Error("Season did not complete within guard limit");

  const userDiv = career.teams[career.userTeamId].divisionId;
  const table = currentTable(career, userDiv);
  console.log(
    `Season ${career.season} (${divisionName(userDiv)}) top3:`,
    table.slice(0, 3).map((r) => `${career.teams[r.teamId].name}(${r.points})`)
  );

  const { career: nextCareer, releasedPlayerIds, retiredPlayerIds, regenPlayerIds, promotions, relegations } = rolloverSeason(career);
  const newUserDiv = nextCareer.teams[nextCareer.userTeamId].divisionId;
  console.log(
    `Rolled to season ${nextCareer.season}. Released ${releasedPlayerIds.length}, retired ${retiredPlayerIds.length}, regens ${regenPlayerIds.length}, total players ${Object.keys(nextCareer.players).length}.`,
    userDivBefore !== newUserDiv ? `User moved Div ${userDivBefore} -> Div ${newUserDiv}!` : ""
  );
  console.log("  Promotions:", Object.entries(promotions).map(([d, ids]) => `D${d}:${ids.length}`).join(" "));
  console.log("  Relegations:", Object.entries(relegations).map(([d, ids]) => `D${d}:${ids.length}`).join(" "));

  // division sizes must stay at 16 each after swaps
  for (let d = 1; d <= 4; d++) {
    const count = Object.values(nextCareer.teams).filter((t) => t.divisionId === d).length;
    if (count !== 16) throw new Error(`Division ${d} has ${count} teams after rollover, expected 16`);
  }

  career = nextCareer;
}

console.log("SMOKE TEST PASSED");
