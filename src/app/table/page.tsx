"use client";

import { useMemo } from "react";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { currentTable } from "@/lib/game/season";

export default function TablePage() {
  const { career, hydrated } = useActiveCareer();
  const table = useMemo(() => (career ? currentTable(career) : []), [career]);

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">League Table — Season {career.season}</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Club</th>
              <th className="px-2 py-2">P</th>
              <th className="px-2 py-2">W</th>
              <th className="px-2 py-2">D</th>
              <th className="px-2 py-2">L</th>
              <th className="px-2 py-2">GF</th>
              <th className="px-2 py-2">GA</th>
              <th className="px-2 py-2">GD</th>
              <th className="px-2 py-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => {
              const team = career.teams[r.teamId];
              const isUser = team.id === career.userTeamId;
              return (
                <tr key={r.teamId} className={`border-t border-slate-800 ${isUser ? "bg-emerald-500/10" : ""}`}>
                  <td className="px-3 py-1.5">{i + 1}</td>
                  <td className={`px-3 py-1.5 font-medium ${isUser ? "text-emerald-300" : ""}`}>{team.name}</td>
                  <td className="px-2 py-1.5 text-center">{r.played}</td>
                  <td className="px-2 py-1.5 text-center">{r.won}</td>
                  <td className="px-2 py-1.5 text-center">{r.drawn}</td>
                  <td className="px-2 py-1.5 text-center">{r.lost}</td>
                  <td className="px-2 py-1.5 text-center">{r.gf}</td>
                  <td className="px-2 py-1.5 text-center">{r.ga}</td>
                  <td className="px-2 py-1.5 text-center">{r.gd}</td>
                  <td className="px-2 py-1.5 text-center font-bold">{r.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {career.seasonHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Past seasons</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            {career.seasonHistory.map((h) => (
              <li key={h.season}>
                Season {h.season}: Champions — {h.champion}. You finished {h.userFinish}
                {h.userFinish === 1 ? "st" : h.userFinish === 2 ? "nd" : h.userFinish === 3 ? "rd" : "th"}.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
