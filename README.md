# Pocket Gaffer ⚽

A browser-based football management career sim — build a club, manage a squad, run tactics, work the transfer market, and play through multiple seasons. Inspired by Football Manager / FC Career Mode, built from scratch with entirely fictional leagues, clubs and players.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Zustand (with localStorage persistence — saves live in your browser, no backend required)

## Features

- **4-tier league pyramid**: 64 procedurally generated clubs (16 per division), ~1,400+ players, with 3-up/3-down promotion & relegation each season
- Granular player positions (GK/CB/LB/RB/DM/CM/AM/LW/RW/ST), attributes, match form, and season stats
- Minute-by-minute match engine with live xG, tactical mentality modifiers (Defensive/Balanced/Attacking), shot coordinates on a spatial pitch grid, cards, fouls, and injuries
- **Match Center**: event ticker, shot map, and live stat meters + cumulative xG chart for every match
- Squad management: attributes, condition, contracts, match form, transfer listing
- Tactics: formation (4-4-2, 4-3-3, 3-5-2, 4-2-3-1) + mentality, starting XI / bench selection
- Asynchronous multi-stage transfer negotiations: AI valuation & counter-offers, personal terms (wage/signing bonus/squad status), and proactive AI bids for your players
- End-of-season rollover: aging, attribute development toward potential, retirements, 16-year-old youth regens, contract renewals/releases, promotion/relegation, new fixtures for all divisions
- Multiple save slots, all stored locally in your browser

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Testing the game engine

```bash
npm run smoke
```

Simulates several full seasons headlessly and checks for engine sanity (realistic scorelines, season rollover, squad churn).

## Deploy

Deployed on Vercel — push to `main` and Vercel builds automatically. No environment variables or database are required; all game state is client-side.
