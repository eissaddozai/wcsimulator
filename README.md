# WC Simulator

A client-side, 48-team FIFA World Cup 26™-format simulator with a broadcast-quality UI:
pick or simulate the qualified nations by confederation, seed the pots by hand or with one of
five variation algorithms, watch a rule-perfect animated draw build the 12 groups, enter or
simulate every score, and follow the tournament automatically — live standings with the full
2026 tiebreaker cascade, the best-thirds race, official Round-of-32 seeding, and knockouts
through the Final and third-place match. Every nation wears an open-source flag
([HatScripts/circle-flags](https://github.com/HatScripts/circle-flags) and
[lipis/flag-icons](https://github.com/lipis/flag-icons), both MIT).

**The complete specification lives in [PLAN.md](./PLAN.md)** — tournament rulebook, simulation
algorithms, UI design language, architecture, and the delivery roadmap.

Planned stack: Vite + React 18 + TypeScript (strict), Zustand, Tailwind CSS v4, Framer Motion,
Vitest/fast-check/Playwright. No backend — deploys as static files.
