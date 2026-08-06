# 150 High-Impact UI Improvements — the GitHub Excavation List

Compiled after mining the open-source landscape (each cited library is MIT/OFL/ISC unless
noted). Items marked ✦ have been executed (36 of 150 so far, across four rounds).

## I. The Play-off Tournament (1–12)
1. ✦ Lift the play-off bracket out of the page into a ceremony pop-up of its own.
2. ✦ Give the pop-up a floodlit hero with kicker, venue line, and March 2026 dateline.
3. ✦ Derive real venue copy from the hosts (Guadalajara & Monterrey when Mexico hosts).
4. ✦ Number the matches canonically (Match 105–108) and tag them in full words.
5. ✦ Attach deterministic weather + referee chips to every play-off match.
6. ✦ Show live advance-probability bars per pairing from the match model.
7. ✦ Rank chips (#12) beside every entrant — seeds justified, upsets legible.
8. ✦ SEED tabs hanging from the finals; jewel AET/PENS ribbons on decided plates.
9. ✦ A slim amber summons-band in selection with entrant flags and live status.
10. ✦ Auto-convene the pop-up the moment the sixth entrant is named.
11. ✦ One-tap "Simulate the tournament" that respects already-played rounds.
12. ✦ Gold micro-burst (canvas-confetti) when the forty-eight are complete.

## II. Global visual grammar (13–32)
13. ✦ A bespoke trophy mark in the appbar wordmark — brand at every step.
14. ✦ Pot medallion discs on seeding columns, echoing the group medals.
15. Gradient-ink section numerals (01–07) watermarked behind each stage title.
16. Grain + vignette tuned per theme via a single CSS custom-property dial.
17. Consistent 8-pt spacing audit across all cards (a dozen odd paddings remain).
18. Elevation scale tokens (--lift-1/2/3) replacing ad-hoc box-shadows.
19. A --radius token pass so every plate shares the 12/14px pair exactly.
20. Hairline-fade utility class to retire the last flat 1px borders.
21. Focus-visible ring unified to the double-gold treatment on ALL interactives.
22. :active scale(0.985) on every card-shaped button, not just .btn.
23. Selection ::selection tint per theme (gold on dark, deep green on light).
24. Reduced-motion audit: every new animation behind the media query.
25. Container queries for cards that reflow below 360px (bracket nodes, pom plates).
26. Print stylesheet: bracket + groups as a one-page tournament poster.
27. Custom cursor (tiny gold dot ring) over interactive bracket nodes.
28. Skeleton shimmer placeholders for flag images while SVGs decode.
29. `:has()` driven row highlight — hovering a fixture highlights both teams in the table.
30. Scroll-linked progress hairline under the appbar (CSS scroll-timeline).
31. View Transitions API between steps for morphing continuity (Chrome path, graceful fallback).
32. Balance text everywhere with text-wrap: balance on headings and captions.

## III. Landing & Laboratory (33–48)
33. ✦ Globe marker pulses on the three host cities (cobe custom render loop).
34. Globe drag-to-spin with inertia (cobe pointer interaction pattern).
35. ✦ Landing cards stagger-rise on first paint (framer-motion variants).
36. A live "last tournament" memory chip — champion flag + seed — if a save exists.
37. ✦ Keyboard hints (1/2/3) on the landing cards.
38. Lab preset cards preview their physics as micro-sparklines (goals curve per preset).
39. Slider thumbs become gold discs with value tooltips while dragging.
40. ✦ Dial values flash amber (gold dot on touched dials) when they leave the FIFA-calibrated default.
41. ✦ "Reset group" per lab card, not only global.
42. A/B compare toggle: pin one model, tune another, preview odds side by side.
43. Live preview picks the two strongest *rivals* (different confederations) for spice.
44. Chaos knob cards get seismograph mini-viz that shakes with the value.
45. Boosters in the Lab studio grouped with collapsible enamel headers.
46. Search within the Lab studio (48 rows deserve a filter).
47. Preset card hover plays a 600ms odds-shift preview on the sample tie.
48. NumberFlow on every Lab value readout (currently static text).

## IV. Selection & quotas (49–62)
49. ✦ Confederation tab badges show live count (UEFA 16/16 in the tab itself).
50. Team cards sort toggle: rank | alphabetical | rating.
51. Multi-select drag: paint across cards to add several nations in one sweep.
52. Rating chip on hover (power bar is silent about its number).
53. "Auto-complete confederation by rank" ghost button per tab.
54. ✦ Quota meters animate their fill with a 300ms ease, not a snap.
55. The ring displays a tick mark at 46 (direct) so the last leg reads as a stage.
56. Host chips in the rail get crown micro-icons and reorder animation.
57. Undo toast after Clear picks (sonner — emilkowalski/sonner).
58. Playoff entrant cards show their would-be semifinal opponent on hover.
59. Search results group by confederation with section headers.
60. `/` shortcut hint chip inside the search field (exists as placeholder — make it a key cap).
61. Empty-state illustration for a filtered list with zero matches.
62. Team card long-press opens Team Studio focused on that nation.

## V. Seeding & Draw (63–78)
63. Pot columns get subtle rank-gradient backgrounds (Pot 1 warmest).
64. Drag ghost is the actual row (setDragImage) instead of browser default.
65. Cross-pot swap preview: target row shows an amber "will swap" state pre-drop.
66. Strategy segment previews its effect in one sentence under the control.
67. Re-roll pots button spins its dice icon (600ms) on click.
68. Draw ball rotates through pot-colored rims as pots change.
69. Ball hop animation: drawn ball arcs toward its group card (framer-motion layoutId).
70. Group cards count 1/4 · 2/4 fills in their headers during the draw.
71. Constraint skips render as amber toast-lines with the rule quoted.
72. ✦ Draw controls dock shows "Ball 17 of 48" in tabular numerals.
73. Auto-draw speed becomes a 1×/2×/4× cycle.
74. Post-draw swap mode gets a distinct grip cursor + row grips.
75. The completed board offers "Copy groups as text" (one-tap share).
76. Draw recap line: longest constraint chain of the night, told in one sentence.
77. Confetti on draw completion respects the reveal zone origin (currently center-left).
78. ✦ Reveal name shimmers once on land (single ink-sheen pass).

## VI. Groups (79–96)
79. ✦ Matchday tabs show per-day completion dots (MD1 ●●●●○○).
80. Group cards flip-order control: table first vs fixtures first.
81. Fixture rows show kickoff pseudo-times (staggered evening slots) for flavor.
82. Live table preview while typing a score — standings shift before commit.
83. Row movement arrows (▲2) for one render after each standings change.
84. GD sparkline per team across their three matches on hover.
85. "Best third" watermark stripe on third-placed rows currently in the top eight.
86. Contention badges get tooltips explaining the exact clinch/elimination math.
87. ✦ Simulate-remaining animates group by group (staggered) instead of popping all.
88. Clear-group undo window (10s) with sonner toast.
89. Head-to-head mini-table popover on tiebreak ⓘ icons.
90. ✦ Group completion seals the card with a brief gold rim sweep.
91. Thirds panel rows show the R32 slot they currently project into (3A→M80 style).
92. Drag-to-reorder in edit mode shows a live legality hint (confederation clashes).
93. Table numerals switch to DSEG for a stadium-board alt view (easter-egg toggle).
94. Fixture dice buttons roll (icon swap 1→6) while simulating.
95. Column header hover highlights the full column.
96. Print-friendly single-group card export (canvas snapshot via html-to-image).

## VII. Knockout & bracket (97–116)
97. ✦ Champion's road glows as one continuous animated gold thread (SVG overlay).
98. Bracket minimap for horizontal navigation on narrow screens.
99. Wing entrance: nodes cascade in from the outer rounds on first visit.
100. ✦ Zoom-to-fit toggle that scales the bracket to viewport width.
101. Node hover shows head-to-head record chip (from this tournament's group stage if met).
102. ✦ Upset marker: lower-ranked winner gets a tiny dagger glyph beside the score.
103. Extra-time matches show a subtle split score (90′ + ET) on hover.
104. Stale (set-aside) nodes get a dashed amber diagonal watermark.
105. ✦ Bronze plate bronzes: a distinct copper gradient for the third-place match.
106. The trophy medallion reflects the champion's flag colors in its glow.
107. ✦ Pulse strip items animate in order on first reveal.
108. Record-win label links to that match's panel on click.
109. Match panel becomes swipeable between adjacent matches (left/right chevrons).
110. Odds card gains a tiny history spark of how odds moved as you tuned the model.
111. ✦ Shootout board kicks stagger-reveal (120ms each) on first open.
112. Theater scoreboard flashes on goals (brief white blink like real LED boards).
113. Theater gets a crowd-noise-style visual: amplitude bars pulsing under the rail.
114. Timeline events cluster into halves with a halftime tick.
115. Recap sentences typewriter in (respecting reduced motion).
116. Champion scene: national-color confetti mixed with gold (from flag palette).

## VIII. Type, numerals & micro-copy (117–128)
117. Fraunces optical sizing axis for the big serif moments (opsz 72 for kickers).
118. ✦ Saira Condensed 700 for scores ≥ semifinals — weight escalates with stakes.
119. Hanging punctuation on kickers (text-indent compensation).
120. All-caps tracking scale: one variable per size tier instead of per-rule letters.
121. Tabular numerals audit — a few chips still proportional.
122. Locale-aware date/number formatting via Intl (venue datelines, odds).
123. ✦ Editorial empty states everywhere ("No draw yet — the balls wait in their pots.").
124. Tooltips written as one-liners with a verb ("Books everything"), consistently.
125. Error copy in the linter panel gets the serif-accent treatment.
126. Match numbers zero-padded on LED surfaces only (M 074) for board realism.
127. The word "penalties" never abbreviated to "pens" in prose (chips may).
128. A glossary popover: Q / E / 3rd? / PO seals explained once, linked from headers.

## IX. Motion & state transitions (129–140)
129. ✦ framer-motion layoutId flag flights: a nation's flag flies from pot → group slot.
130. Step transitions slide directionally (forward = left, back = right).
131. Number-flow trend coloring: green roll up, red roll down for odds.
132. Button success states morph (Simulate → ✓ Simulated) for 800ms.
133. Modal open anchors from its trigger (scale from button origin).
134. Drag targets breathe (1% scale loop) while a compatible drag is held.
135. Card sheen sweeps trigger on completion events only (never on hover) — audit.
136. The gold progress ring eases with spring physics on big jumps.
137. Confetti bursts derive origin from the celebrated element's position.
138. Reduced-motion replaces all sweeps with opacity fades (never nothing).
139. Route-level Suspense shimmer for the heavy screens (bracket).
140. A single `useCelebration()` hook so every gold moment shares choreography.

## X. Accessibility & platform polish (141–150)
141. Full keyboard bracket navigation (arrow keys walk nodes; Enter opens panel).
142. aria-live="polite" announcements for standings changes after score entry.
143. Landmarks audit: nav/main/complementary roles on the three-pane screens.
144. Color-blind safe alternative markers (patterns on Q/E seals, not hue alone).
145. prefers-contrast: more variant with hairlines promoted to 2px.
146. Screen-reader text for every score well ("Portugal three, Ghana one").
147. Touch targets ≥ 40px on all dice and clear buttons (several are 28px).
148. PWA manifest + icon set (the trophy mark) for installable app feel.
149. OG/social card image generated from the trophy + wordmark (satori/vercel-og).
150. Lighthouse a11y/perf budget in CI — the walkthrough script fails under 95.
