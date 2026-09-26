# Pocket Gaffer ⚽

A browser-based football management career sim — build a club, manage a squad, run tactics, work the transfer market, and play through multiple seasons. Inspired by Football Manager / FC Career Mode, built from scratch with entirely fictional leagues, clubs and players.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Zustand (with localStorage persistence — saves live in your browser, no backend required)

## Features

- Procedurally generated 16-team league, squads, and player attributes each new career
- Season-long fixture schedule (double round robin), simulated matchday by matchday
- Statistical match engine (attack/defense ratings → Poisson-based scoring, goal events, injuries, fitness)
- Squad management: attributes, condition, contracts, transfer listing
- Tactics: formation selection (4-4-2, 4-3-3, 3-5-2, 4-2-3-1) and starting XI / bench selection
- Transfer market: buy free agents or bid for AI club players; receive and respond to incoming offers
- End-of-season rollover: player aging, attribute development toward potential, retirements, contract renewals/releases, new fixture list for the next season
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
