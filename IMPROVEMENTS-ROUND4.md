# Round Four — one hundred refinements toward a single design language

The invisible-lines pass plus a systematic polish sweep: type rhythm, surface
depth, color discipline, micro-interaction, and per-screen alignment. All 100
executed.

## Typography & rhythm (1–12)
1. One heading scale — every screen's H2 sits at 34px with matched tracking.
2. Kickers share a single size/letterspacing token.
3. Tabular numerals enforced across every standings cell.
4. Body-copy measure capped at 640px everywhere.
5. Section overlines unified at one letterspacing.
6. Primary CTAs gain +0.02em display tracking.
7. Standings header row: smaller, dimmer caps with more air beneath.
8. Fixture team names unified at 13px/600.
9. All chips share one 10.5px/600 text baseline.
10. Score inputs share one uniform height.
11. Text contrast normalized to exactly three tiers (hi/mid/low).
12. Serif accents settle at line-height 1.5.

## Surface & depth (13–26)
13. One radius scale — cards 14, inputs 8, pills 999.
14. Resting cards carry a 1px top-light inset for material depth.
15. One hover-elevation shadow token everywhere.
16. Dialogs share a single deep shadow + gold-tinged border.
17. Slideovers glow at the edge instead of ending in a hard line.
18. Group cards lose their double borders; table hairlines drop to 60%.
19. Bracket node borders soften at rest, sharpen on hover.
20. The appbar gains a translucent blur backdrop.
21. The footerbar matches it with blur and the gold hairline.
22. Playoff scrollers fade at their top and bottom edges.
23. The menu drawer moves to the 4pt padding grid.
24. Overlay dimming unified to one tint.
25. Empty states share one dashed-container style.
26. The zoom dock and pulse tiles share one glass token.

## Color & state (27–40)
27. Q / E / 3rd? badges normalized to one green, one muted red, one amber.
28. Table position bars thin to 2px at 70%.
29. Pure bright gold reserved for champions and finals.
30. Danger buttons rest quiet, bite on hover.
31. Focus rings dim slightly on dark fields to kill glare.
32. Selected-card washes calm by a fifth.
33. Play-off amber wash matches the same alpha.
34. Active segments glow inward instead of shouting.
35. One table-row hover token.
36. Disabled buttons: .38 opacity, no shadow.
37. Text links warm to gold on hover.
38. Badges set in 8.5px/800 caps.
39. Stage dots draw from one stage-color map.
40. Slim custom scrollbars on every inner scroller.

## Micro-interaction (41–52)
41. Every button presses (scale .98) on active.
42. Dice buttons tip 12° on hover.
43. Flags breathe (scale 1.06) in the team grid.
44. Chip borders brighten on hover.
45. Slider thumbs glow while focused.
46. Segment switches animate their fill in 160ms.
47. Score inputs focus with a gold ring and slight lift.
48. Bracket nodes give press feedback.
49. The draw's primary CTA carries a slow sheen.
50. Booster chips press and glow when stacked.
51. Menu items indent 2px on hover.
52. Unlocked stepper steps lift on hover.

## The group stage (53–62)
53. The flanking fixture lines are gone — scores sit on clean ground.
54. Score boxes: uniform height, centered dash.
55. Completed scores set at weight 700.
56. Simulated gold digits deepen for light-theme contrast.
57. Group progress bars thin to 3px.
58. The SEALED stamp shrinks and tucks into the corner.
59. GF/GA/GD columns get equal width, right-aligned.
60. Group card headers align to one baseline.
61. Form dots refined to 4px at 3px gaps.
62. Matchday counts render as quiet pills.

## The knockout (63–72)
63. Node score columns fix their width so scores align down a wing.
64. Pens superscripts sit on a corrected baseline.
65. Round headers gain tracking; the live pulse shrinks.
66. The champion thread's halo blurs softer.
67. Medal and trophy glyphs center vertically.
68. The champion name letterspaces.
69. Connector elbows round off.
70. Pulse tiles equalize height; icons calm to 80%.
71. Glory rows fix their stage column at 15px.
72. Ghost shimmer slows to a five-second drift.

## Panels & modals (73–82)
73. The match hero's name rows stop shifting when chips appear.
74. The meta ribbon centers and wraps safely.
75. The odds capsule moves to the 4pt rhythm.
76. The momentum worm drops its axis clutter.
77. The minute axis drops its redundant 0′ label.
78. Report ledger lines hang-indent their wraps.
79. The report worm rebalances for light theme.
80. The theater rail thickens to 5px.
81. Playoff card headers and controls align.
82. Berth sockets sit on the footer baseline.

## Selection, seeding, draw (83–92)
83. The ring number and caption get weight and tracking.
84. Quota labels fix their column so all meters align.
85. Tab progress rings center vertically.
86. Team cards hold one height whether starred or ranked.
87. The search pill holds its width while typing.
88. Pot rows unify at one height.
89. Sparklines align with their titles.
90. Draw slots unify height; empty slots go quiet-dashed.
91. The coach mark centers under the ceremony.
92. The ball counter fixes its width against jitter.

## Global (93–100)
93. Footer paddings audited onto the 4pt grid.
94. Every chip vertically centers via inline-flex.
95. prefers-contrast: more bumps every hairline.
96. The page background token holds in exported single-files.
97. One progress-color token across ring, bars, and steps.
98. Empty-state copy set in one serif style.
99. Inner scrollers get overscroll containment.
100. Dead CSS swept (retired chips, old rails) for a leaner sheet.
