"use client";

import { useMemo, useState } from "react";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { useGameStore } from "@/lib/game/store";
import { playerOverall } from "@/lib/game/ratings";
import { formatMoney } from "@/lib/game/format";
import { Player } from "@/lib/game/types";

export default function TransfersPage() {
  const { career, hydrated } = useActiveCareer();
  const buyPlayer = useGameStore((s) => s.buyPlayer);
  const respondToIncomingOffer = useGameStore((s) => s.respondToIncomingOffer);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tab, setTab] = useState<"market" | "offers">("market");

  const market = useMemo(() => {
    if (!career) return [];
    return Object.values(career.players)
      .filter((p) => p.teamId !== career.userTeamId)
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => playerOverall(b) - playerOverall(a))
      .slice(0, 60);
  }, [career, query]);

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  const pendingOffers = career.transferOffers.filter((o) => o.status === "pending");

  function handleBuy(p: Player) {
    const amount = p.teamId === null ? 0 : Math.round(p.value * 1.05);
    const res = buyPlayer(p.id, amount);
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transfers</h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setTab("market")}
            className={`px-3 py-1.5 rounded-md ${tab === "market" ? "bg-emerald-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"}`}
          >
            Market
          </button>
          <button
            onClick={() => setTab("offers")}
            className={`px-3 py-1.5 rounded-md relative ${tab === "offers" ? "bg-emerald-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"}`}
          >
            Offers {pendingOffers.length > 0 && <span className="ml-1 text-xs">({pendingOffers.length})</span>}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-sm">{feedback}</div>
      )}

      {tab === "market" ? (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players…"
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="px-2 py-2">Pos</th>
                  <th className="px-2 py-2">Age</th>
                  <th className="px-2 py-2">OVR</th>
                  <th className="text-left px-2 py-2">Club</th>
                  <th className="px-2 py-2">Value</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {market.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-2 py-2 text-center text-slate-400">{p.position}</td>
                    <td className="px-2 py-2 text-center">{p.age}</td>
                    <td className="px-2 py-2 text-center font-bold text-emerald-400">{playerOverall(p)}</td>
                    <td className="px-2 py-2 text-slate-400">
                      {p.teamId ? career.teams[p.teamId]?.name : <span className="text-amber-400">Free Agent</span>}
                    </td>
                    <td className="px-2 py-2 text-center">{p.teamId ? formatMoney(p.value) : "—"}</td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => handleBuy(p)}
                        className="px-2 py-1 rounded bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400"
                      >
                        {p.teamId ? `Bid ${formatMoney(Math.round(p.value * 1.05))}` : "Sign Free"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          {career.transferOffers.length === 0 && (
            <div className="text-slate-500 text-sm">No transfer activity yet. List players in your Squad to attract bids.</div>
          )}
          {career.transferOffers
            .slice()
            .reverse()
            .map((o) => {
              const p = career.players[o.playerId];
              const buyer = career.teams[o.toTeamId];
              if (!p) return null;
              return (
                <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.name} <span className="text-slate-500 text-sm">({p.position}, OVR {playerOverall(p)})</span></div>
                    <div className="text-sm text-slate-400">{buyer?.name} offers {formatMoney(o.amount)}</div>
                  </div>
                  {o.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToIncomingOffer(o.id, true)}
                        className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-sm font-semibold"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToIncomingOffer(o.id, false)}
                        className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs font-semibold ${o.status === "accepted" ? "text-emerald-400" : "text-slate-500"}`}>
                      {o.status.toUpperCase()}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
