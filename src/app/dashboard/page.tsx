"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/game/store";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { currentTable, isSeasonComplete } from "@/lib/game/season";
import { ordinal, formatMoney } from "@/lib/game/format";

export default function Dashboard() {
  const { career, hydrated } = useActiveCareer();
  const router = useRouter();
  const playNextMatchday = useGameStore((s) => s.playNextMatchday);
  const advanceSeasonIfComplete = useGameStore((s) => s.advanceSeasonIfComplete);
  const lastMatchSummary = useGameStore((s) => s.lastMatchSummary);

  const table = useMemo(() => (career ? currentTable(career) : []), [career]);
  const seasonDone = career ? isSeasonComplete(career) : false;

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  const team = career.teams[career.userTeamId];
  const position = table.findIndex((r) => r.teamId === team.id) + 1;
  const nextFixture = career.fixtures.find(
    (f) => f.season === career.season && f.matchday === career.matchday &&
      (f.homeTeamId === team.id || f.awayTeamId === team.id)
  );
  const opponent = nextFixture
    ? career.teams[nextFixture.homeTeamId === team.id ? nextFixture.awayTeamId : nextFixture.homeTeamId]
    : null;
  const isHome = nextFixture?.homeTeamId === team.id;

  const recentNews = career.news.slice(-6).reverse();
  const pendingOffers = career.transferOffers.filter((o) => o.status === "pending");

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="League Position" value={`${ordinal(position || table.length)} / ${table.length}`} />
        <StatCard label="Transfer Budget" value={formatMoney(team.transferBudget)} />
        <StatCard label="Wage Budget / szn" value={formatMoney(team.wageBudget)} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {seasonDone ? (
          <div className="text-center space-y-3">
            <h2 className="text-xl font-bold text-emerald-400">Season {career.season} complete!</h2>
            <p className="text-slate-400">
              {career.seasonHistory.length > 0 || true
                ? `Final position: ${ordinal(position)} of ${table.length}.`
                : ""}
            </p>
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
              <div className="text-sm text-slate-400">{isHome ? "Home" : "Away"} fixture</div>
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

      {lastMatchSummary && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-2">
          <h3 className="font-semibold text-slate-200">Full time</h3>
          <div className="text-sm text-slate-300 font-mono space-y-1 max-h-60 overflow-auto">
            {lastMatchSummary.text.map((line, i) => (
              <div key={i} className={i === 0 ? "text-lg font-bold text-emerald-400 mb-2" : ""}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {pendingOffers.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-4 flex items-center justify-between">
          <span className="text-amber-200 text-sm">
            You have {pendingOffers.length} pending transfer offer{pendingOffers.length > 1 ? "s" : ""} for your players.
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
