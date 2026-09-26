"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useGameStore } from "@/lib/game/store";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { currentTable, isSeasonComplete } from "@/lib/game/season";
import { ordinal, formatMoney } from "@/lib/game/format";
import { divisionName } from "@/lib/game/divisions";

export default function Dashboard() {
  const { career, hydrated } = useActiveCareer();
  const playNextMatchday = useGameStore((s) => s.playNextMatchday);
  const advanceSeasonIfComplete = useGameStore((s) => s.advanceSeasonIfComplete);
  const lastMatchResult = useGameStore((s) => s.lastMatchResult);

  const table = useMemo(() => (career ? currentTable(career) : []), [career]);
  const seasonDone = career ? isSeasonComplete(career) : false;

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  const team = career.teams[career.userTeamId];
  const position = table.findIndex((r) => r.teamId === team.id) + 1;
  const nextFixture = career.fixtures.find(
    (f) => f.season === career.season && f.divisionId === team.divisionId && f.matchday === career.matchday &&
      (f.homeTeamId === team.id || f.awayTeamId === team.id)
  );
  const opponent = nextFixture
    ? career.teams[nextFixture.homeTeamId === team.id ? nextFixture.awayTeamId : nextFixture.homeTeamId]
    : null;
  const isHome = nextFixture?.homeTeamId === team.id;

  const recentNews = career.news.slice(-6).reverse();
  const activeOffers = career.transferOffers.filter((o) => o.stage !== "Completed" && o.stage !== "Rejected");

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label={divisionName(team.divisionId)} value={`${ordinal(position || table.length)} / ${table.length}`} />
        <StatCard label="Transfer Budget" value={formatMoney(team.transferBudget)} />
        <StatCard label="Wage Budget / szn" value={formatMoney(team.wageBudget)} />
        <StatCard label="Formation" value={`${team.formation} · ${team.mentality}`} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {seasonDone ? (
          <div className="text-center space-y-3">
            <h2 className="text-xl font-bold text-emerald-400">Season {career.season} complete!</h2>
            <p className="text-slate-400">Final position: {ordinal(position)} of {table.length} in {divisionName(team.divisionId)}.</p>
            <button
              onClick={() => advanceSeasonIfComplete()}
              className="px-5 py-2.5 rounded-md bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
            >
              Continue to Season {career.season + 1} →
            </button>
          </div>
        ) : nextFixture ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase text-slate-500 tracking-wide">Matchday {career.matchday}</div>
              <div className="text-lg font-bold mt-1">
                {isHome ? team.name : opponent?.name} <span className="text-slate-500">vs</span>{" "}
                {isHome ? opponent?.name : team.name}
              </div>
              <div className="text-sm text-slate-400">{isHome ? "Home" : "Away"} fixture · {divisionName(team.divisionId)}</div>
            </div>
            <button
              onClick={() => playNextMatchday()}
              className="px-5 py-2.5 rounded-md bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
            >
              ▶ Play Match
            </button>
          </div>
        ) : (
          <div className="text-slate-400">No fixture this matchday.</div>
        )}
      </div>

      {lastMatchResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Full time</div>
            <div className="text-xl font-bold">
              {lastMatchResult.homeName} {lastMatchResult.result.homeGoals} - {lastMatchResult.result.awayGoals} {lastMatchResult.awayName}
            </div>
          </div>
          <Link href="/match" className="px-4 py-2 rounded-md bg-slate-800 text-sm font-semibold hover:bg-slate-700">
            View Match Center →
          </Link>
        </div>
      )}

      {activeOffers.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-amber-200 text-sm">
            {activeOffers.length} active transfer negotiation{activeOffers.length > 1 ? "s" : ""}.
          </span>
          <Link href="/transfers" className="text-sm font-semibold text-amber-300 underline">Review →</Link>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-slate-200 mb-3">News</h3>
        <ul className="space-y-1.5 text-sm text-slate-400">
          {recentNews.map((n) => <li key={n.id}>· {n.text}</li>)}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs uppercase text-slate-500 tracking-wide">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
