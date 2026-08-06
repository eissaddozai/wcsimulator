# 50 Additions to the Simulation Model

Realism the engine could still learn. Items marked ✦ are implemented.

## Scoring realism (1–10)
1. ✦ Scoring gravity — soft ceiling compressing monster expected-goal counts (8-0 is once a generation, not every mismatch).
2. ✦ Game management — leads of 2, 3, 4+ progressively take the foot off the gas.
3. ✦ Conversion fatigue — past a third goal the box packs, the keeper grows, finishing regresses.
4. ✦ Demoralization — three or more down, heads drop; the chase reflex only fires within two.
5. Shot-location xG model — chance quality drawn from a real location mixture, not one exponential.
6. Rebound chains — saves can spill into immediate second chances.
7. Deflection own-goals at a realistic ~3% of all goals.
8. Woodwork events — near-misses recorded and narrated, feeding "how did that stay out" recaps.
9. Keeper form — a per-tournament goalkeeper variance axis, the quiet difference-maker.
10. Header share by team height profile — set-piece goals lean aerial for tall squads.

## Discipline & referees (11–16)
11. ✦ Red-card rate re-expressed as an honest per-match probability (default 9%, dial 0–40%).
12. Yellow-card accumulation — two bookings across group games = one-match suspension.
13. Second-yellow discipline profiles — reckless squads collect more late seconds.
14. Card-prone grudge pairings — derbies and repeat meetings run hotter.
15. VAR overturns — a small chance a goal is chalked off, with narrative.
16. Referee big-game bias — some officials swallow the whistle in finals.

## Squad & fatigue (17–24)
17. Tournament-long fatigue accumulation — every 120-minute epic leaves a permanent 1% tax.
18. Bench depth axis — deep squads rotate through dead rubbers without decay.
19. Injury events — a star can be lost mid-tournament, denting attack until the final.
20. Age curves — veteran cores fade in second halves; young squads finish stronger.
21. Acclimatization — altitude/heat penalties shrink for teams grouped in those venues.
22. Travel legs — crossing venue clusters between rounds costs freshness.
23. Winter-league sharpness — leagues in season arrive sharper in June.
24. Recovery-day differentials from the real match calendar.

## Psychology & momentum (25–33)
25. In-match momentum — goals tilt the next ten minutes beyond the scoreline mood.
26. Comeback resilience axis — some squads are built to chase, some fold.
27. Shootout composure memory — a nation's past shootout record colors the next one.
28. First-knockout nerves for tournament debutants.
29. Favorite-tag pressure — group winners carry expectation into the R32.
30. Revenge arcs — losing a group meeting sharpens a knockout rematch.
31. Manager in-game adjustments — trailing sides switch shape at 60' with variance.
32. Late-siege mode — trailing by one after 80' triggers keeper-up chaos minutes.
33. Champion's polish — sides that win ugly early round into form by the semis.

## Environment & venues (34–40)
34. Real venue assignment — the sixteen 2026 stadiums with their own climates and altitudes.
35. Kickoff-slot heat — afternoon Dallas in June is not evening Vancouver.
36. Roofed stadiums cancel weather entirely.
37. Pitch wear — late-tournament surfaces slow passing tempo.
38. Crowd composition — CONCACAF sides carry de-facto home support anywhere in the region.
39. Hostile-crowd effect for the host's knockout opponents.
40. Thin-air ball flight — altitude adds long-range goals specifically.

## Structure & meta (41–50)
41. Group-stage rotation — coasting leaders rest legs on MD3, opening the door.
42. Seeded strength-in-depth — pot-4 variance axis: some minnows are structured, some chaotic.
43. Confederation style priors — CONMEBOL ties run hotter; UEFA knockouts tighter.
44. Extra-time substitution boost — fresh legs matter more from minute 91.
45. Penalty-taker designation — boosters or studio picks for a named clutch taker.
46. Silver-goal / golden-goal alternate rulesets as Lab toggles.
47. Third-place motivation split — some squads treat bronze as gold, some are on the beach.
48. Weibull inter-goal timing — realistic clustering of late goals.
49. Score-effects asymmetry calibrated per rating gap (favorites protect, underdogs gamble).
50. Full ELO feedback loop — results update ratings mid-tournament, so a giant-killer becomes a giant.
