# Round Three — fifty simulator-depth systems, fifty visuals that surface them

Fifty backend systems that make the simulation drastically stronger — all
self-operating and contextual, none of them new Lab dials — and fifty visual
items, most of which put the new machinery on screen.

**Status: all 100 executed.** Verified by 63 passing tests (11 new: campaign
math, determinism, stoppage bounds, event vocabulary, tag production, odds
integration, BTTS distribution) and a full screenshot sweep.

## The Simulation Fifty (1–50)

### Minute-engine events & flow
1. Real stoppage time — added minutes at 45′ and 90′ derived from the half's event load; goals land at 45+2′, 90+4′ and are recorded that way.
2. Momentum engine — every goal and red swings a decaying momentum state that tilts chance-rates for the next stretch.
3. Panic response — conceding twice inside ten minutes rattles a side: more errors, more chances against.
4. Injuries — knocks arrive as events and dent that side's legs for the rest of the match.
5. Injury carryover — a knock in a knockout tie costs freshness in the next round, alongside ET and pens.
6. Substitutions — three windows (HT, the hour, the 80th); fresh legs slow the late fade; subs are events on the timeline.
7. VAR — a scored goal can be chalked off moments later; the reversal is its own event and story beat.
8. Big-chance misses — clear chances squandered become 'miss' events that swing momentum and feed the report.
9. Own goals — generated under pressure with their own prose (the detail existed; the pressure pathway now produces it).
10. Free-kick goals — a dead-ball goal family with specialist phrasing.
11. Per-goal xG — every goal (and big miss) carries its chance quality: the 0.06 screamer vs the 0.90 tap-in.
12. Late-rain slip — rain matches loosen after the hour: wilder finishing, looser shots.
13. Referee flashpoint clusters — cards breed cards for a spell after any booking, harder under strict officials.
14. Red-card shock — a sending-off chills the tempo for five minutes, then the match reopens harder.
15. Rivalry heat — a derby table (ARG–BRA, ENG–GER, USA–MEX, JPN–KOR, …) adds bite, cards, and variance.
16. Star quality — each nation's derived star factor decides late moments: 80th-minute chances sharpen for sides with a talisman.
17. Giant-nerves auto-context — huge favorites tighten in knockouts automatically, no dial required.
18. Host surge — host advantage grows round by round as the country dares to dream.
19. Comeback carry — winning from two down banks a morale bounce into the next round.
20. Epic-shootout toll — surviving a marathon shootout (10+ kicks) costs extra freshness next time out.

### Tournament-level systems
21. Tournament form — an Elo-style live drift: every result nudges in-tournament strength, so runs and slumps compound.
22. Suspension engine — cards accumulate; heavy card counts and reds suspend players, modeled as an absence burden next match.
23. Card amnesty — accumulated yellows wipe after the quarterfinals, FIFA-style.
24. Group-stakes engine — MD3 desperation computed from the live table: needing a win pushes a side automatically.
25. Dead-rubber auto-detection — both-safe MD3 games loosen without touching the Lab dial.
26. Deep fatigue — freshness now walks the feeder chain: back-to-back extra-time epics stack their residue.
27. Momentum carry combines — the campaign adjustments (19, 20, 26) resolve through one feeder-chain walker.
28. Weather by stage — knockout nights skew cooler and stormier than the group stage.
29. Host shootout lean — the crowd behind the goal is worth a sliver in host shootouts.
30. Result tags — every simulated match self-labels: ROUT, THRILLER, COMEBACK, SHOCK, SMASH-AND-GRAB, LATE SHOW, SIEGE.

### Shootout depth
31. Pressure kicks — conversion sags on kicks four and five.
32. Keeper momentum — a save lifts the keeper's odds on the next kick; streaks happen.
33. Star openers — the talisman takes kick one and converts above base.
34. Sudden-death decay — beyond kick six, nerves erode conversion kick by kick.
35. Host lean applied — (29) wired into the shootout model proper.

### Odds & analytics integrity
36. Odds respect tournament form — markets move round to round as drift accumulates.
37. Odds respect suspensions — the absence burden prices into advance markets.
38. Knockout draw-tail — 90-minute draw odds firm up under knockout tension automatically.
39. Distribution validation — a test pins BTTS/over-2.5 analytic odds against the minute engine's actual output distributions.
40. Deterministic systems — same seed, same tournament: a regression test locks every new system to the seed.

### Narrative depth
41. Tag-aware headlines — comeback, shock, and siege matches draw from their own headline registers.
42. Standfirsts cite context — rivalry, suspensions, and MD3 stakes appear in the standfirst when present.
43. Chapter prose variety — three prose skeletons per half, chosen by the half's momentum shape.
44. Key-moment scoring — the moment is chosen by xG, timing, and tags, not just the last goal.
45. New verdict families — smash-and-grab, deserved rout, keeper heist, coin-flip.
46. Tag-aware recaps — the bracket panel's one-liner draws from the tag pool.
47. Modality-flavored logs — qualification logs open with their modality's voice ("The form book says…").
48. Pulse counts the new events — VAR reversals and injuries join the tournament pulse data.
49. Group sims flow in matchday order — stakes and suspensions propagate correctly through a one-click group sim.
50. Campaign math unit-tested — drift, burden, stakes, and stoppage arithmetic pinned by tests.

## The Visual Fifty (51–100)

### Surfacing the new machinery
51. Stoppage minutes render as 45+2′ / 90+3′ across timeline, theater, and report.
52. Injury markers (medical cross) on the minute axis.
53. Substitution arrows on the minute axis.
54. VAR reversals: struck-through "goal" moments in the report ledger and timeline.
55. Result-tag chips on scored group fixtures.
56. Result-tag micro-chips on decided knockout nodes.
57. Suspension-burden chips in the match panel hero.
58. Live tournament-form arrows beside team names in the match panel.
59. Momentum worm — the match's momentum log as a sparkline in the panel.
60. Star marker (★) on top-percentile nations in team cards and the studio.
61. DERBY ribbon on rivalry ties in the panel.
62. Pulse tiles for VAR reversals and injuries.
63. Report ledger icons for injury, sub, and VAR lines.
64. Per-goal xG chips on report goal lines.
65. Shootout board: shaded sudden-death zone with label.
66. Shootout board: keeper-streak flame on consecutive saves.
67. Theater clock shows 45+X during added time.
68. Theater momentum bar tilting live beneath the board.

### Fresh polish
69. Form-guide dots (W/D/L) beside each team in group tables.
70. Points cells glide via NumberFlow when the table moves.
71. Knockout nodes get a hover halo that marks them as openable.
72. The draw ball wears its confederation's color ring during the reveal.
73. Confederation tabs render micro progress rings.
74. Landing medallions glint with a sheen sweep on hover.
75. The active stepper step carries a micro progress bar (e.g. scored/total).
76. The in-play matchday tab shows a LIVE dot.
77. A faint vertical halo rises behind the bracket's champion column.
78. Champion road rows carry their result tags.
79. Champion confetti tints toward the champion's confederation color.
80. Fixture rows carry home/away accent borders.
81. The odds capsule shows form arrows inline with the percentages.
82. The studio Boosters button tints by net-effect direction.
83. The menu's save row shows the champion's flag once crowned.
84. The selection ring carries tick marks at the direct-quota boundary.
85. Search highlights the matched substring in nation names.
86. Pot rows show a confederation micro-dot before the rank chip.
87. Full draw-board groups show a four-dot confederation diversity strip.
88. Sealed group headers show their two qualified flags inline.
89. Bronze and final nodes carry medal/trophy glyphs in their meta rows.
90. The host chip in the match panel wears a crown.
91. Report chapters print their minute ranges right-aligned.
92. The report standfirst opens with a drop cap.
93. The theater board flashes GOAL with the scorer's side on each strike.
94. Thirds-panel group chips tint like their group medallions.
95. Bracket zoom binds to +/− keys, with the hint in the dock tooltip.
96. The pulse strip sticks to the top while the bracket scrolls.
97. Ghost (unresolved) knockout nodes shimmer faintly.
98. Light-theme contrast audit for the LED faces and minute axis.
99. Every new animation gates behind prefers-reduced-motion.
100. Accessibility parity — aria labels for every new marker, tag, and chip.
