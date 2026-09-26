"use client";

import { useMemo, useState } from "react";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { useGameStore } from "@/lib/game/store";
import { formatMoney } from "@/lib/game/format";
import { Player } from "@/lib/game/types";

export default function SquadPage() {
  const { career, hydrated } = useActiveCareer();
  const toggleListPlayer = useGameStore((s) => s.toggleListPlayer);
  const [sortKey, setSortKey] = useState<"overall" | "age" | "value" | "position">("overall");

  const squad = useMemo(() => {
    if (!career) return [];
    const players = Object.values(career.players).filter((p) => p.teamId === career.userTeamId);
    return players.sort((a, b) => {
      if (sortKey === "overall") return b.currentRating - a.currentRating;
      if (sortKey === "age") return a.age - b.age;
      if (sortKey === "value") return b.marketValue - a.marketValue;
      return a.position.localeCompare(b.position);
    });
  }, [career, sortKey]);

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Squad</h1>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as any)}
          className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="overall">Sort: Overall</option>
          <option value="position">Sort: Position</option>
          <option value="age">Sort: Age</option>
          <option value="value">Sort: Value</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="px-2 py-2">Pos</th>
              <th className="px-2 py-2">Age</th>
              <th className="px-2 py-2">OVR</th>
              <th className="px-2 py-2">POT</th>
              <th className="px-2 py-2">Form</th>
              <th className="px-2 py-2">Condition</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Contract</th>
              <th className="px-2 py-2">Value</th>
              <th className="px-2 py-2">Wage</th>
              <th className="px-2 py-2">Listed</th>
            </tr>
          </thead>
          <tbody>
            {squad.map((p) => (
              <PlayerRow key={p.id} player={p} onToggleList={(listed) => toggleListPlayer(p.id, listed)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerRow({ player, onToggleList }: { player: Player; onToggleList: (listed: boolean) => void }) {
  const avgForm = player.matchForm.length ? player.matchForm.reduce((s, f) => s + f, 0) / player.matchForm.length : null;
  return (
    <tr className="border-t border-slate-800 hover:bg-slate-800/30">
      <td className="px-3 py-2 font-medium whitespace-nowrap">
        {player.name} {player.isRegen && <span className="text-emerald-500 text-xs">YTH</span>}
      </td>
      <td className="px-2 py-2 text-center text-slate-400">{player.position}</td>
      <td className="px-2 py-2 text-center">{player.age}</td>
      <td className="px-2 py-2 text-center font-bold text-emerald-400">{player.currentRating}</td>
      <td className="px-2 py-2 text-center text-slate-500">{player.potentialRating}</td>
      <td className="px-2 py-2 text-center text-slate-300">{avgForm ? avgForm.toFixed(1) : "—"}</td>
      <td className="px-2 py-2 text-center">
        <div className="w-16 h-2 bg-slate-800 rounded-full mx-auto overflow-hidden">
          <div
            className={`h-full ${player.condition > 70 ? "bg-emerald-500" : player.condition > 40 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${player.condition}%` }}
          />
        </div>
      </td>
      <td className="px-2 py-2 text-center text-xs">
        {player.injuryWeeks > 0 ? (
          <span className="text-red-400">Injured ({player.injuryWeeks}w)</span>
        ) : (
          <span className="text-slate-500">Fit</span>
        )}
      </td>
      <td className="px-2 py-2 text-center text-slate-400">{player.contractYears}y</td>
      <td className="px-2 py-2 text-center text-slate-300">{formatMoney(player.marketValue)}</td>
      <td className="px-2 py-2 text-center text-slate-300">{formatMoney(player.wage)}</td>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={!!player.listedForTransfer}
          onChange={(e) => onToggleList(e.target.checked)}
          className="accent-emerald-500"
        />
      </td>
    </tr>
  );
}
