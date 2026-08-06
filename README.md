# WC26 Simulator

A client-side, 48-team FIFA World Cup 26™-format simulator with a broadcast-quality
"stadium night" UI. Pick or simulate the qualified nations by confederation, seed the pots by
hand or with one of five variation algorithms, watch a rule-perfect animated draw build the 12
groups, enter or simulate every score, and follow the tournament automatically — live standings
with the full 2026 head-to-head-first tiebreaker cascade, the best-thirds race, official
Round-of-32 seeding, and knockouts through the Final and third-place match.

**The complete specification lives in [PLAN.md](./PLAN.md)** — tournament rulebook, simulation
algorithms, UI design language, architecture, and roadmap.

## Run it

```bash
npm install
npm run dev        # local dev server
npm test           # 29 engine tests: tiebreakers, draw Monte Carlo, Annexe C, integration
npm run build      # typecheck + production bundle (dist/)
```

## What's inside

- **Pure engine** (`src/engine/`) — zero framework imports: seeded RNG (xmur3→mulberry32 with
  named streams), qualification simulator (Plackett–Luce with a chaos knob and a simulated
  FIFA Play-Off Tournament), five seeding strategies, a backtracking draw solver that
  replicates FIFA's constraint procedure and provably never dead-ends, the 2026 tiebreaker
  cascade with head-to-head sub-table recursion, best-thirds ranking, the official R32 slot
  map with candidate-set thirds allocation, bivariate-Poisson match simulation with ET and
  penalties, and points-only elimination proofs for honest Q/OUT badges.
- **Data** — all 211 FIFA nations with confederations, rankings, ratings, and explicit flag
  codes; the real 2026 tournament (qualifiers, pots, actual draw) as a loadable preset.
- **Flags** — vendored SVGs from [HatScripts/circle-flags](https://github.com/HatScripts/circle-flags)
  and [lipis/flag-icons](https://github.com/lipis/flag-icons) (both MIT), synced by
  `npm run sync-flags`, which fails on any unmapped code.
- **UI** — React 18 + TypeScript strict + Zustand (persisted to localStorage), Framer Motion
  draw choreography, dark/light themes, keyboard-first score entry, edit-the-past protection
  with a "set aside, restorable" invalidation model, and a champion scene with one restrained
  burst of confetti.

Rankings and ratings are factual data compiled from public sources (FIFA ranking,
eloratings.net-style strength estimates). No FIFA marks or imagery are used.
