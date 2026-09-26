import { nanoid } from "nanoid";
import { Career, Player, SquadStatus, TransferOffer } from "./types";
import { estimateWage, playerOverall } from "./ratings";

export function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `€${Math.round(n / 1000)}K`;
  return `€${n}`;
}

function squadStatusFor(player: Player, buyerReputation: number): SquadStatus {
  const gap = player.currentRating - buyerReputation;
  if (gap >= 8) return "Star Player";
  if (gap >= 0) return "Important";
  if (gap >= -10) return "Rotation";
  return "Prospect";
}

function wageDemandMultiplier(status: SquadStatus): number {
  return { "Star Player": 1.6, Important: 1.25, Rotation: 1.0, Prospect: 0.8 }[status];
}

// --- Outgoing: user bids to sign a player from another club or free agency ---

export function submitBid(career: Career, playerId: string, amount: number): Career {
  const player = career.players[playerId];
  if (!player) return career;
  const isFreeAgent = player.teamId === null;

  const offer: TransferOffer = {
    id: nanoid(8),
    playerId,
    fromTeamId: player.teamId,
    toTeamId: career.userTeamId,
    amount: isFreeAgent ? 0 : amount,
    stage: isFreeAgent ? "Accepted" : "Pending_AI_Review",
    direction: "outgoing",
    createdSeason: career.season,
    createdMatchday: career.matchday,
    log: [isFreeAgent
      ? `${career.teams[career.userTeamId].name} offer ${player.name} a contract as a free agent.`
      : `${career.teams[career.userTeamId].name} bid ${formatMoney(amount)} for ${player.name}.`],
  };

  let offers = [...career.transferOffers, offer];
  let career2 = { ...career, transferOffers: offers };
  if (isFreeAgent) {
    career2 = beginContractNegotiation(career2, offer.id);
  }
  return career2;
}

// AI seller club evaluates a pending outgoing bid: accept, counter, or reject.
function evaluateOutgoingBid(career: Career, offer: TransferOffer): Career {
  const player = career.players[offer.playerId];
  if (!player || !offer.fromTeamId) return career;
  const sellerTeam = career.teams[offer.fromTeamId];
  if (!sellerTeam) return career;

  const threshold = player.marketValue * (0.85 + Math.random() * 0.35);
  let offers = career.transferOffers.map((o) => o.id === offer.id ? { ...o } : o);
  const idx = offers.findIndex((o) => o.id === offer.id);

  if (offer.amount >= threshold) {
    offers[idx] = { ...offers[idx], stage: "Accepted", log: [...offers[idx].log, `${sellerTeam.name} accept the ${formatMoney(offer.amount)} bid for ${player.name}.`] };
    return beginContractNegotiation({ ...career, transferOffers: offers }, offer.id);
  }

  const counterFloor = player.marketValue * 0.95;
  const shouldCounter = offer.amount >= player.marketValue * 0.55 && Math.random() < 0.7;
  if (shouldCounter) {
    const counterAmount = Math.round(Math.max(counterFloor, offer.amount * 1.2) / 1000) * 1000;
    offers[idx] = {
      ...offers[idx],
      stage: "Countered",
      counterAmount,
      log: [...offers[idx].log, `${sellerTeam.name} reject the bid but would accept ${formatMoney(counterAmount)}.`],
    };
  } else {
    offers[idx] = { ...offers[idx], stage: "Rejected", log: [...offers[idx].log, `${sellerTeam.name} reject the bid for ${player.name} outright.`] };
  }
  return { ...career, transferOffers: offers };
}

function beginContractNegotiation(career: Career, offerId: string): Career {
  const offer = career.transferOffers.find((o) => o.id === offerId);
  if (!offer) return career;
  const player = career.players[offer.playerId];
  const buyer = career.teams[offer.toTeamId];
  if (!player || !buyer) return career;

  const status = squadStatusFor(player, buyer.reputation);
  const baseWage = estimateWage(player.currentRating, player.age);
  const wage = Math.round((baseWage * wageDemandMultiplier(status)) / 50) * 50;
  const signOnFee = Math.round((player.marketValue * 0.03 * wageDemandMultiplier(status)) / 500) * 500;

  const offers = career.transferOffers.map((o) => o.id === offerId ? {
    ...o,
    stage: "Contract_Negotiation" as const,
    wage,
    signOnFee,
    squadStatusDemanded: status,
    log: [...o.log, `${player.name} (targeting ${status} status) wants ${formatMoney(wage)}/yr plus a ${formatMoney(signOnFee)} signing bonus.`],
  } : o);
  return { ...career, transferOffers: offers };
}

// User accepts or rejects a Countered fee, or the personal-terms package in Contract_Negotiation.
export function respondToOutgoingOffer(career: Career, offerId: string, action: "accept" | "reject" | "raise", raiseAmount?: number): Career {
  const offer = career.transferOffers.find((o) => o.id === offerId);
  if (!offer || offer.direction !== "outgoing") return career;

  if (offer.stage === "Countered") {
    if (action === "reject") {
      return setStage(career, offerId, "Rejected", "You walk away from the negotiation.");
    }
    if (action === "raise" && raiseAmount) {
      const offers = career.transferOffers.map((o) => o.id === offerId ? {
        ...o, stage: "Pending_AI_Review" as const, amount: raiseAmount,
        log: [...o.log, `You improve your bid to ${formatMoney(raiseAmount)}.`],
      } : o);
      return { ...career, transferOffers: offers };
    }
    // accept their counter
    const offers = career.transferOffers.map((o) => o.id === offerId ? {
      ...o, stage: "Accepted" as const, amount: o.counterAmount ?? o.amount,
      log: [...o.log, `You agree to their asking price of ${formatMoney(o.counterAmount ?? o.amount)}.`],
    } : o);
    return beginContractNegotiation({ ...career, transferOffers: offers }, offerId);
  }

  if (offer.stage === "Contract_Negotiation") {
    if (action === "reject") {
      return setStage(career, offerId, "Rejected", `${career.players[offer.playerId]?.name ?? "The player"} negotiations collapse.`);
    }
    return finalizeTransfer(career, offerId);
  }

  return career;
}

function setStage(career: Career, offerId: string, stage: TransferOffer["stage"], logLine: string): Career {
  const offers = career.transferOffers.map((o) => o.id === offerId ? { ...o, stage, log: [...o.log, logLine] } : o);
  return { ...career, transferOffers: offers };
}

function finalizeTransfer(career: Career, offerId: string): Career {
  const offer = career.transferOffers.find((o) => o.id === offerId);
  if (!offer) return career;
  const player = career.players[offer.playerId];
  if (!player) return career;

  const buyerId = offer.toTeamId;
  const sellerId = offer.fromTeamId;
  const buyer = career.teams[buyerId];
  if (!buyer) return career;

  const totalCost = offer.amount + (offer.signOnFee ?? 0);
  if (offer.direction === "outgoing" && totalCost > buyer.transferBudget) {
    return setStage(career, offerId, "Rejected", `${buyer.name} can no longer afford the total package.`);
  }

  const players = {
    ...career.players,
    [offer.playerId]: {
      ...player,
      teamId: buyerId,
      wage: offer.wage ?? player.wage,
      listedForTransfer: false,
      contractYears: 3,
    },
  };
  const teams = { ...career.teams };
  teams[buyerId] = { ...teams[buyerId], transferBudget: teams[buyerId].transferBudget - totalCost };
  if (sellerId && teams[sellerId]) {
    teams[sellerId] = { ...teams[sellerId], transferBudget: teams[sellerId].transferBudget + offer.amount };
  }

  const offers = career.transferOffers.map((o) => o.id === offerId ? {
    ...o, stage: "Completed" as const,
    log: [...o.log, `Done deal! ${player.name} joins ${buyer.name}.`],
  } : o);
  const freeAgentIds = career.freeAgentIds.filter((id) => id !== offer.playerId);

  return { ...career, players, teams, transferOffers: offers, freeAgentIds };
}

export function listPlayerForTransfer(career: Career, playerId: string, listed: boolean): Career {
  const player = career.players[playerId];
  if (!player) return career;
  return { ...career, players: { ...career.players, [playerId]: { ...player, listedForTransfer: listed } } };
}

// --- Incoming: AI clubs scan the league and bid for the user's players ---

export function generateIncomingOffers(career: Career): Career {
  const squad = Object.values(career.players).filter((p) => p.teamId === career.userTeamId);
  const offers: TransferOffer[] = [...career.transferOffers];
  const teamIds = Object.keys(career.teams).filter((id) => id !== career.userTeamId);
  const userTeamRep = career.teams[career.userTeamId].reputation;

  for (const p of squad) {
    const alreadyPending = offers.some((o) => o.playerId === p.id && o.direction === "incoming" && !["Rejected", "Completed"].includes(o.stage));
    if (alreadyPending) continue;
    const chance = p.listedForTransfer ? 0.35 : 0.025;
    if (Math.random() < chance) {
      const buyerId = teamIds[Math.floor(Math.random() * teamIds.length)];
      const buyer = career.teams[buyerId];
      if (!buyer || buyer.transferBudget < p.marketValue * 0.7) continue;
      const amount = Math.round((p.marketValue * (0.8 + Math.random() * 0.5)) / 1000) * 1000;
      const status = squadStatusFor(p, buyer.reputation);
      offers.push({
        id: nanoid(8),
        playerId: p.id,
        fromTeamId: career.userTeamId,
        toTeamId: buyerId,
        amount,
        wage: estimateWage(p.currentRating, p.age),
        squadStatusDemanded: status,
        stage: "Pending_AI_Review", // awaiting the USER's review, in the incoming direction
        direction: "incoming",
        createdSeason: career.season,
        createdMatchday: career.matchday,
        log: [`${buyer.name} offer ${formatMoney(amount)} for ${p.name}.`],
      });
    }
  }
  void userTeamRep;
  return { ...career, transferOffers: offers };
}

export function respondToIncomingOffer(career: Career, offerId: string, action: "accept" | "reject" | "counter", counterAmount?: number): Career {
  const offer = career.transferOffers.find((o) => o.id === offerId);
  if (!offer || offer.direction !== "incoming") return career;

  if (offer.stage === "Pending_AI_Review" || offer.stage === "Countered") {
    if (action === "reject") return setStage(career, offerId, "Rejected", "You reject the offer.");
    if (action === "counter" && counterAmount) {
      const offers = career.transferOffers.map((o) => o.id === offerId ? {
        ...o, stage: "Countered" as const, counterAmount,
        log: [...o.log, `You ask for ${formatMoney(counterAmount)} instead.`],
      } : o);
      return reviewCounterAsAiBuyer({ ...career, transferOffers: offers }, offerId);
    }
    // accept
    const finalAmount = offer.stage === "Countered" ? (offer.counterAmount ?? offer.amount) : offer.amount;
    const offers = career.transferOffers.map((o) => o.id === offerId ? { ...o, amount: finalAmount, stage: "Accepted" as const } : o);
    return finalizeIncomingSale({ ...career, transferOffers: offers }, offerId);
  }
  return career;
}

// AI buyer decides whether to match the user's counter-ask for one of the user's players.
function reviewCounterAsAiBuyer(career: Career, offerId: string): Career {
  const offer = career.transferOffers.find((o) => o.id === offerId);
  if (!offer || !offer.counterAmount) return career;
  const buyer = career.teams[offer.toTeamId];
  const player = career.players[offer.playerId];
  if (!buyer || !player) return career;

  const willing = offer.counterAmount <= player.marketValue * 1.25 && offer.counterAmount <= buyer.transferBudget;
  if (willing && Math.random() < 0.6) {
    const offers = career.transferOffers.map((o) => o.id === offerId ? {
      ...o, amount: offer.counterAmount!, stage: "Accepted" as const,
      log: [...o.log, `${buyer.name} agree to pay ${formatMoney(offer.counterAmount!)}.`],
    } : o);
    return finalizeIncomingSale({ ...career, transferOffers: offers }, offerId);
  }
  return setStage(career, offerId, "Rejected", `${buyer.name} won't meet your asking price and walk away.`);
}

function finalizeIncomingSale(career: Career, offerId: string): Career {
  const offer = career.transferOffers.find((o) => o.id === offerId);
  if (!offer) return career;
  const player = career.players[offer.playerId];
  const buyer = career.teams[offer.toTeamId];
  if (!player || !buyer) return career;

  const players = { ...career.players, [offer.playerId]: { ...player, teamId: offer.toTeamId, listedForTransfer: false, contractYears: 3 } };
  const teams = { ...career.teams };
  teams[career.userTeamId] = { ...teams[career.userTeamId], transferBudget: teams[career.userTeamId].transferBudget + offer.amount };
  teams[offer.toTeamId] = { ...teams[offer.toTeamId], transferBudget: Math.max(0, teams[offer.toTeamId].transferBudget - offer.amount) };

  const offers = career.transferOffers.map((o) => o.id === offerId ? {
    ...o, stage: "Completed" as const, log: [...o.log, `${player.name} moves to ${buyer.name} for ${formatMoney(offer.amount)}.`],
  } : o);

  return { ...career, players, teams, transferOffers: offers };
}

// --- Weekly tick: call once per matchday advance to process the whole pipeline ---

export function processWeeklyTransferActivity(career: Career): Career {
  let next = career;
  const pendingOutgoing = next.transferOffers.filter((o) => o.direction === "outgoing" && o.stage === "Pending_AI_Review");
  for (const offer of pendingOutgoing) {
    next = evaluateOutgoingBid(next, offer);
  }
  next = generateIncomingOffers(next);
  return next;
}
