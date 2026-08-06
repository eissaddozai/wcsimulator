# The 64-Team World Cup Modality — Pinned Specification

User-specified format for the forthcoming 64-team mode. This document is the
source of truth for the build.

## Direct berths (60)

| Confederation | Direct berths |
| --- | --- |
| UEFA | 21 |
| CAF | 12 |
| AFC | 10 |
| CONCACAF | 8 |
| CONMEBOL | 8 |
| OFC | 1 |
| **Direct qualifiers** | **60** |
| Intercontinental playoff winners | 4 |
| **World Cup total** | **64** |

## 16 Intercontinental Playoff Entrants

(amended: one OFC berth reassigned to CONMEBOL)

| Confederation | Designated teams |
| --- | --- |
| UEFA | UEFA 1, UEFA 2, UEFA 3 |
| CAF | CAF 1, CAF 2, CAF 3 |
| AFC | AFC 1, AFC 2, AFC 3 |
| CONCACAF | CONCACAF 1, CONCACAF 2, CONCACAF 3 |
| CONMEBOL | CONMEBOL 1, CONMEBOL 2, CONMEBOL 3 |
| OFC | OFC 1 |
| **Total** | **16 teams** |

Team N = the Nth-highest-ranked playoff qualifier within its confederation.

## Four Playoff Tournaments (semifinals + final; winner takes a berth)

| Tournament | Semifinal 1 | Semifinal 2 | Berth |
| --- | --- | --- | --- |
| A | UEFA 1 vs CONMEBOL 3 | CAF 3 vs AFC 2 | 61 |
| B | CAF 1 vs CONCACAF 3 | AFC 3 vs OFC 1 | 62 |
| C | AFC 1 vs UEFA 3 | CONCACAF 2 vs CONMEBOL 2 | 63 |
| D | CONCACAF 1 vs CAF 2 | CONMEBOL 1 vs UEFA 2 | 64 |

No playoff tournament contains two teams from the same confederation.

## Tournament structure downstream

- 16 groups (A–P) of 4; top two advance — 32 into the knockout (no best-thirds).
- 96 group matches; the existing 32-team knockout tree carries the rest.
- Seeding: four pots of 16. Draw constraints scale: max 1 per confederation
  per group, UEFA up to 2 (21 teams across 16 groups requires doubling-up in
  at least five groups).
- Format switch lives beside the existing 48-team mode; every screen
  (selection quotas, playoff pop-up with four tournaments, 16-group draw
  board and hub, bracket sources) parameterizes on the format.
