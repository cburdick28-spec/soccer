import { nanoid } from "nanoid";
import { Career, Player, Team, TransferOffer } from "./types";
import { estimateWage, playerOverall } from "./ratings";

// User makes an offer to buy a player (from another club or a free agent).
export function makeBuyOffer(career: Career, playerId: string, amount: number): { career: Career; result: "accepted" | "rejected"; message: string } {
  const player = career.players[playerId];
  if (!player) return { career, result: "rejected", message: "Player not found." };
  const userTeam = career.teams[career.userTeamId];

  if (player.teamId === career.userTeamId) {
    return { career, result: "rejected", message: "Already your player." };
  }
  if (amount > userTeam.transferBudget) {
    return { career, result: "rejected", message: "Not enough transfer budget." };
  }

  const isFreeAgent = player.teamId === null;
  const threshold = player.value * (0.85 + Math.random() * 0.35);
  const accepted = isFreeAgent || amount >= threshold;

  if (!accepted) {
    return { career, result: "rejected", message: `${player.name}'s club rejected the offer as too low.` };
  }

  const wage = Math.max(player.wage, estimateWage(playerOverall(player), player.age));
  if (wage > userTeam.wageBudget) {
    return { career, result: "rejected", message: `${player.name} would demand wages above your budget.` };
  }

  const oldTeamId = player.teamId;
  const players = {
    ...career.players,
    [playerId]: { ...player, teamId: career.userTeamId, wage, listedForTransfer: false, contractYearsLeft: 3 },
  };
  const teams = { ...career.teams };
  teams[career.userTeamId] = {
    ...userTeam,
    transferBudget: userTeam.transferBudget - amount,
    wageBudget: userTeam.wageBudget - wage,
  };
  if (oldTeamId && teams[oldTeamId]) {
    teams[oldTeamId] = {
      ...teams[oldTeamId],
      transferBudget: teams[oldTeamId].transferBudget + amount,
    };
  }
  const freeAgentIds = career.freeAgentIds.filter((id) => id !== playerId);

  return {
    career: { ...career, players, teams, freeAgentIds },
    result: "accepted",
    message: `Deal done! ${player.name} joins for ${formatMoney(amount)}.`,
  };
}

export function listPlayerForTransfer(career: Career, playerId: string, listed: boolean): Career {
  const player = career.players[playerId];
  if (!player) return career;
  return { ...career, players: { ...career.players, [playerId]: { ...player, listedForTransfer: listed } } };
}

// Randomly generate incoming AI bids for listed (or highly valued) user players. Call weekly.
export function generateIncomingOffers(career: Career): Career {
  const userTeam = career.teams[career.userTeamId];
  const squad = Object.values(career.players).filter((p) => p.teamId === career.userTeamId);
  const offers: TransferOffer[] = [...career.transferOffers];
  const teamIds = Object.keys(career.teams).filter((id) => id !== career.userTeamId);

  for (const p of squad) {
    const chance = p.listedForTransfer ? 0.35 : 0.03;
    if (Math.random() < chance) {
      const buyerId = teamIds[Math.floor(Math.random() * teamIds.length)];
      const buyer = career.teams[buyerId];
      if (!buyer || buyer.transferBudget < p.value * 0.7) continue;
      const amount = Math.round((p.value * (0.8 + Math.random() * 0.5)) / 1000) * 1000;
      offers.push({
        id: nanoid(8),
        playerId: p.id,
        fromTeamId: career.userTeamId,
        toTeamId: buyerId,
        amount,
        wage: estimateWage(playerOverall(p), p.age),
        status: "pending",
        direction: "incoming",
      });
    }
  }
  return { ...career, transferOffers: offers };
}

export function respondToOffer(career: Career, offerId: string, accept: boolean): Career {
  const offer = career.transferOffers.find((o) => o.id === offerId);
  if (!offer) return career;
  if (!accept) {
    return { ...career, transferOffers: career.transferOffers.map((o) => (o.id === offerId ? { ...o, status: "rejected" } : o)) };
  }
  const player = career.players[offer.playerId];
  if (!player) return career;
  const players = { ...career.players, [offer.playerId]: { ...player, teamId: offer.toTeamId, listedForTransfer: false } };
  const teams = { ...career.teams };
  teams[career.userTeamId] = { ...teams[career.userTeamId], transferBudget: teams[career.userTeamId].transferBudget + offer.amount };
  return {
    ...career,
    players,
    teams,
    transferOffers: career.transferOffers.map((o) => (o.id === offerId ? { ...o, status: "accepted" } : o)),
  };
}

export function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `€${Math.round(n / 1000)}K`;
  return `€${n}`;
}
