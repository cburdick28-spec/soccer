"use client";

import { useMemo, useState } from "react";
import { useActiveCareer } from "@/lib/game/useActiveCareer";
import { useGameStore } from "@/lib/game/store";
import { formatMoney } from "@/lib/game/format";
import { Player, TransferOffer } from "@/lib/game/types";

export default function TransfersPage() {
  const { career, hydrated } = useActiveCareer();
  const submitTransferBid = useGameStore((s) => s.submitTransferBid);
  const respondOutgoing = useGameStore((s) => s.respondOutgoing);
  const respondIncoming = useGameStore((s) => s.respondIncoming);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"market" | "offers">("market");

  const market = useMemo(() => {
    if (!career) return [];
    return Object.values(career.players)
      .filter((p) => p.teamId !== career.userTeamId)
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.currentRating - a.currentRating)
      .slice(0, 60);
  }, [career, query]);

  if (!hydrated || !career) return <div className="text-slate-400">Loading…</div>;

  const activeOffers = career.transferOffers.filter((o) => o.stage !== "Completed" && o.stage !== "Rejected");
  const outgoingActive = activeOffers.filter((o) => o.direction === "outgoing");
  const incomingActive = activeOffers.filter((o) => o.direction === "incoming");

  function handleBuy(p: Player) {
    const amount = p.teamId === null ? 0 : Math.round(p.marketValue * 1.05);
    submitTransferBid(p.id, amount);
    setTab("offers");
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
            className={`px-3 py-1.5 rounded-md ${tab === "offers" ? "bg-emerald-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-300"}`}
          >
            Negotiations {activeOffers.length > 0 && <span className="ml-1 text-xs">({activeOffers.length})</span>}
          </button>
        </div>
      </div>

      {tab === "market" ? (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players…"
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
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
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{p.name}</td>
                    <td className="px-2 py-2 text-center text-slate-400">{p.position}</td>
                    <td className="px-2 py-2 text-center">{p.age}</td>
                    <td className="px-2 py-2 text-center font-bold text-emerald-400">{p.currentRating}</td>
                    <td className="px-2 py-2 text-slate-400 whitespace-nowrap">
                      {p.teamId ? career.teams[p.teamId]?.name : <span className="text-amber-400">Free Agent</span>}
                    </td>
                    <td className="px-2 py-2 text-center">{p.teamId ? formatMoney(p.marketValue) : "—"}</td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => handleBuy(p)}
                        className="px-2 py-1 rounded bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400"
                      >
                        {p.teamId ? `Bid ${formatMoney(Math.round(p.marketValue * 1.05))}` : "Sign Free"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Your bids</h2>
            {outgoingActive.length === 0 && <div className="text-slate-500 text-sm">No active bids.</div>}
            {outgoingActive.map((o) => (
              <OutgoingCard key={o.id} offer={o} career={career} onRespond={respondOutgoing} />
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Offers for your players</h2>
            {incomingActive.length === 0 && <div className="text-slate-500 text-sm">No incoming offers. List players in Squad to attract interest.</div>}
            {incomingActive.map((o) => (
              <IncomingCard key={o.id} offer={o} career={career} onRespond={respondIncoming} />
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">History</h2>
            {career.transferOffers
              .filter((o) => o.stage === "Completed" || o.stage === "Rejected")
              .slice(-10)
              .reverse()
              .map((o) => {
                const p = career.players[o.playerId];
                return (
                  <div key={o.id} className="text-xs text-slate-500">
                    {p?.name ?? "Unknown player"} — <span className={o.stage === "Completed" ? "text-emerald-500" : "text-red-500"}>{o.stage}</span>
                  </div>
                );
              })}
          </section>
        </div>
      )}
    </div>
  );
}

function OutgoingCard({
  offer, career, onRespond,
}: {
  offer: TransferOffer;
  career: NonNullable<ReturnType<typeof useActiveCareer>["career"]>;
  onRespond: (offerId: string, action: "accept" | "reject" | "raise", raiseAmount?: number) => void;
}) {
  const player = career.players[offer.playerId];
  const seller = offer.fromTeamId ? career.teams[offer.fromTeamId] : null;
  if (!player) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{player.name} <span className="text-slate-500 text-sm">({player.position}, OVR {player.currentRating})</span></div>
          <div className="text-sm text-slate-400">{seller ? `From ${seller.name}` : "Free agent"}</div>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-amber-300">{offer.stage.replace(/_/g, " ")}</span>
      </div>
      <div className="text-xs text-slate-500 space-y-0.5">
        {offer.log.slice(-3).map((line, i) => <div key={i}>· {line}</div>)}
      </div>

      {offer.stage === "Countered" && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onRespond(offer.id, "accept")} className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-sm font-semibold">
            Pay {formatMoney(offer.counterAmount ?? offer.amount)}
          </button>
          <button onClick={() => onRespond(offer.id, "raise", Math.round((offer.counterAmount ?? offer.amount) * 0.7))} className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-sm">
            Improve bid
          </button>
          <button onClick={() => onRespond(offer.id, "reject")} className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-sm">
            Walk away
          </button>
        </div>
      )}

      {offer.stage === "Contract_Negotiation" && (
        <div className="space-y-2 pt-1">
          <div className="text-sm text-slate-300">
            Wants {formatMoney(offer.wage ?? 0)}/yr + {formatMoney(offer.signOnFee ?? 0)} signing bonus
            {offer.squadStatusDemanded ? ` as a ${offer.squadStatusDemanded}` : ""}.
          </div>
          <div className="flex gap-2">
            <button onClick={() => onRespond(offer.id, "accept")} className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-sm font-semibold">
              Agree terms
            </button>
            <button onClick={() => onRespond(offer.id, "reject")} className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-sm">
              Reject
            </button>
          </div>
        </div>
      )}

      {offer.stage === "Pending_AI_Review" && (
        <div className="text-xs text-slate-500 italic">Awaiting the club's response…</div>
      )}
    </div>
  );
}

function IncomingCard({
  offer, career, onRespond,
}: {
  offer: TransferOffer;
  career: NonNullable<ReturnType<typeof useActiveCareer>["career"]>;
  onRespond: (offerId: string, action: "accept" | "reject" | "counter", counterAmount?: number) => void;
}) {
  const player = career.players[offer.playerId];
  const buyer = career.teams[offer.toTeamId];
  if (!player || !buyer) return null;
  const displayAmount = offer.stage === "Countered" ? offer.counterAmount ?? offer.amount : offer.amount;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{player.name} <span className="text-slate-500 text-sm">({player.position}, OVR {player.currentRating})</span></div>
          <div className="text-sm text-slate-400">{buyer.name} offer {formatMoney(displayAmount)}</div>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-800 text-amber-300">{offer.stage.replace(/_/g, " ")}</span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onRespond(offer.id, "accept")} className="px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 text-sm font-semibold">
          Accept
        </button>
        <button onClick={() => onRespond(offer.id, "counter", Math.round(player.marketValue * 1.15))} className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-sm">
          Counter {formatMoney(Math.round(player.marketValue * 1.15))}
        </button>
        <button onClick={() => onRespond(offer.id, "reject")} className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-sm">
          Reject
        </button>
      </div>
    </div>
  );
}
