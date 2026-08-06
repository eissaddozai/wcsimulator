# The Visual Hundred — high-noticeability improvements, identified and unexecuted

Compiled from a maximal screenshot sweep (28 states: every screen, both themes,
both formats, every modal) plus a pass over the styles. Each item is concrete
and would be visible at a glance. Nothing here has been executed.

## Landing (1–8)

1. The hero sub-paragraph sits directly on the globe's dot-matrix and fights it — add a radial scrim behind the text block so the copy floats on clean dark.
2. The fact ticker's items collide with the globe glow and clip at both edges mid-word — mask the band with edge gradients and raise item contrast from low grey to warm ivory.
3. The giant "26" watermark clips mid-glyph at the right viewport edge — anchor it into the corner with intentional bleed and drop its opacity behind the setup cards.
4. The three setup cards carry identical visual weight — give the recommended path (Real 2026) a gold spine, slight scale, and a "fastest start" micro-tag so the eye has a first move.
5. Card icons sit in plain circles — set each in a faceted gold medallion with an inner ring that echoes the trophy mark.
6. The landing is fully static until hover — drift the globe a few degrees per minute and run a slow shimmer across the H1's gold letters.
7. The keyboard chips (1/2/3) float unexplained in card corners — restyle as true key-cap hints with "press 1" microcopy on hover.
8. The closing love-letter line is orphaned — set it in small caps between flanking hairline rules, matching the app's section dividers.

## App bar & stepper (9–16)

9. Stepper connectors are literal em-dashes — replace with thin lines that fill gold as each step completes.
10. Completed steps keep the same disc weight as pending ones — tint done discs gold-on-dark and ghost the not-yet-reachable ones.
11. The appbar trophy never reacts to anything — set a tiny gold star above it once a champion is crowned.
12. Zoom pill + theme + Tournament crowd each other at mid widths — collapse zoom into a single-icon popover.
13. The active step's halo is faint — give the current step a soft outer glow and a letterspaced label.
14. The appbar bottom edge is flat — add a 1px border-image gradient (transparent → gold → transparent) echoing the ceremony heroes.
15. Screen changes hard-cut — add a 250ms shared enter transition (fade + 8px rise) on the step router.
16. The footerbar pops in and out abruptly between screens — slide it with a spring and reserve a consistent height slot.

## The Laboratory (17–26)

17. The active chamber's rail tint never reaches the chamber panel — wash the chamber head border and slider thumbs with the chamber's color.
18. Dial rows are visually uniform — tighten the two-column dial grid with hairline separators and grouped sub-clusters.
19. Slider tracks show no calibration reference — draw a tick at each dial's stock default and a gold dot on touched dials, so "distance from calibrated" is visible per dial.
20. Fingerprint numbers change with no direction cue — flash green/red delta glyphs beside fav/draw/goals on every dial move.
21. "Your strongest pairing" lacks a face-off header — add the two flags large with a stage-context chip.
22. Preset chips are text-only — add a tiny 3-notch realism→arcade position meter to each chip.
23. The active preset is just an outline — pin a gold "LIVE" dot and gently dim the other tiers.
24. Squad rows render rank/rating as bare inputs — put the rating on an editable power bar with a delta badge when overridden from baseline.
25. The squads list is one undifferentiated column of 48–64 rows — add sticky confederation subheaders with counts, or a confed filter row.
26. Dial blurbs live only under each slider — echo the active dial's blurb large in a live caption strip while dragging.

## Team Selection (27–36)

27. The inactive format option reads as disabled — brighten its hover state and crossfade the meta line ("12 groups · 104 matches") on switch.
28. The qualification ring's target jump (52 ↔ 76) is instant — animate the arc re-target when the format flips.
29. Quota meters are 1px slivers, and an over-quota count (UEFA 22/21 after a play-off win) silently overflows — thicken to 6px rounded segments and show the extra as a distinct gold "PO winner" pip.
30. Play-off pips inside the meters are nearly invisible at 6px — give them a diamond shape and amber fill.
31. A confederation hitting its quota only underlines a number — flip the whole tab chip to gold fill at quota.
32. Selected team cards rely on a small check — wash them with a green-gold edge gradient and lift on hover; play-off entrants get an amber wash.
33. The search field is bare — enclose it in a pill with the "/" shortcut as a real key-cap chip.
34. The five qualifying-modality chips read as unrelated filters — arrange them on a labeled chalk→anarchy gradient rail with a position indicator.
35. The play-off band only appears after the first entrant — always render a ghost band ("Tap beyond a quota to name play-off entrants") for discoverability.
36. The play-off log is raw text — set it as a scoreboard ledger with flags, scores in tabular figures, and berth chips.

## Host picker (37–39)

37. Chosen hosts don't preview their group anchors — badge them "opens Group A/B/D" in selection order.
38. "Surprise me" reveals hosts with no ceremony — stagger-flip the chosen flags before the dialog closes.
39. The 1–3 host allowance is text-only — show three visible host sockets that fill as you pick.

## Seeding (40–45)

40. The four pot columns are undifferentiated — tint headers 1–4 along a strength gradient (gold → silver → bronze → slate) and echo it on row hover.
41. The ⌀-rating chip is cryptic — replace with a mini sparkline of each pot's rating spread, labeled "avg".
42. Host rows show only a lock — add a gold "HOST · GROUP A" micro-tag.
43. Drag affordances are faint grip dots — lift rows with shadow on hover and highlight legal swap targets during a drag.
44. The chaos slider appears beside the strategy seg with no visual relationship — tie them with a connecting bracket when active.
45. The pots linter is a plain text line — style it as an amber diagnostic card with an icon and the offending confederation counts.

## The Draw (46–52)

46. The idle reveal text ("The stage is set.") is small — set it large in serif italic with a slow breathing glow.
47. Pot-progress dots are tiny — enlarge to pill segments showing ghosted flags of already-drawn teams (a mini history).
48. A skipped group only flashes its header — also shake the blocked slot and float the constraint reason as a toast by the group card.
49. The flag landing in its slot has no impact moment — add a scale-pop ring at the destination slot.
50. The receiving group card only changes border — spotlight it by dimming sibling cards ~20% during the hold phase.
51. The post-draw "drag to swap" hint is easy to miss — show a one-time coach-mark of the drag gesture.
52. The 16-group board keeps 48-format header type — scale the group medallions and names down a notch under `.board-64`.

## Group Stage (53–62)

53. Fixture rows use trigraphs (SDN, KOR) while tables use names — prefer short names at wide widths with trigraphs only under ~1100px.
54. Entered and simulated scores look identical — tint simulated digits gold and manual entries white, with a dice watermark on simulated rows.
55. The tiny report button hides beside the dice — slide in a per-fixture action bar (dice · report · clear) on row hover.
56. Group progress "gdots" are minuscule — replace with a 6-segment progress bar under the group header.
57. A finished group gets no flourish — stamp a rotated "SEALED" wax-style badge and slightly desaturate its fixtures.
58. The tiebreak info dot is grey and missable — color it amber when head-to-head decided placement, with the rung named in a hover chip.
59. Matchday tab fill bars are 2px — thicken them and print the count (16/24) inside each tab.
60. The thirds slideover panel edge is flat — add a gold left border-image and a header mosaic of the current top-eight flags.
61. The qualification line in the thirds race is text-only — draw a dashed gold cut line and shade the eliminated zone below it.
62. Provisional thirds rows only say "in play" — pulse those rows gently until their group seals.

## Knockout bracket (63–72)

63. Round headers are plain labels — add per-round match counts (8 · 4 · 2 · 1) and enlarge the live-round pulse.
64. Every decided connector is the same 2px gold — taper the champion's route visibly thicker so the road reads even without the SVG thread.
65. Ghost sources ("Group A winner") read as body text — set them as small-caps slotted placeholders with dotted underlines.
66. The upset dagger (†) is cryptic — replace with a small amber "UPSET" flag chip on the winner's row.
67. The bronze node looks like any compact node — frame it in bronze with a medal icon, distinct from the gold final.
68. Pens verdicts truncate inside nodes at low zoom — move the shootout digits to the score column as superscripts (3–3⁵⁻⁴).
69. The empty champion slot is a static ghost trophy — add faint orbiting particles so the destination feels alive before it's claimed.
70. The zoom dock floats detached above the bracket — dock it glassmorphic to the bracket's corner and remember zoom per format.
71. All rounds share one node size at 100% — scale importance progressively so the final is physically the largest tie.
72. The pulse strip is a plain text row — set each stat in a tile with an icon and animated count-up; give "record win" its two flags.

## Match panel (73–80)

73. The hero flags sit against a flat panel top — add a stage-colored gradient band (R32 → Final each get a hue) behind the hero.
74. The weather chip floats alone — fold weather, temperature, stage, and match number into one meta ribbon under the hero.
75. Score inputs are generic boxes — frame them in a scoreboard plate using the LED face for entered digits.
76. The advance verdict is small caps text — promote to a full-width gold verdict bar carrying the winner's flag.
77. Timeline events wrap as ragged chips — switch to a true horizontal minute axis with 15′ gridlines, goals above the line, cards below.
78. The shootout board renders below the fold — auto-expand it with a kick-by-kick stagger whenever pens exist.
79. The serif recap line floats free — tuck it under the verdict bar with a quotation rule.
80. Simulate/Clear/Close carry equal weight — gold primary for Simulate, danger ghost for Clear, neutral icon for Close.

## Match report (81–84)

81. The swing chart is a single hairline in a tall empty box — fill the area under the lead line per side and mark each goal with a dot and minute label.
82. Consecutive bookings repeat "into the book" seven times — collapse them into grouped entries ("Three Ecuador bookings — 3′, 14′, 41′") while goals keep full rows.
83. The headline is plain caps — set it in the display face at 34px with a gold kicker rule and the scoreline in LED digits.
84. The closing verdict is italic text alone — pair it with a miniature xG duel bar.

## Match theater (85–86)

85. The replay dialog floats small in darkness — widen it into a stadium card with the environment line and stage label above the LED board.
86. Goals on the progress rail are faint dots — render them as gold balls with team initials and pulse the scoreboard on each.

## Play-off ceremonies (87–90)

87. Settled and live tournaments render at equal luminance — dim settled trees slightly and enlarge the winner's flag in their headers.
88. The sixteen entrant chips are an undifferentiated cloud — group them visually by confederation with hairline dividers.
89. The 48 ceremony's zigzag leaves diagonal voids — thread a faint dotted path SF1 → Final 1 and SF2 → Final 2 so the voids read as flow.
90. "N berths still on the pitch" is quiet text — replace with a live berth tracker: four sockets labeled 61–64 filling with winner flags.

## Champion scene (91–94)

91. The road-to-glory card holds trailing empty space while rows animate in — size it to content so the crowned row grows the card.
92. The final scoreline row is bare — chip-style the pens/aet note and caption the stage and match number.
93. The confetti fires once and dies — add a gentle continuous gold drift behind the scene.
94. "New tournament" competes with "Back to the bracket" — demote it to a text link and add a primary "Save this run".

## Tournament menu & archive (95–96)

95. The menu is a plain dropdown — restyle as a mini drawer with section headers (Run · Archive · Data), aligned icons, and a monospaced seed row with a copy button.
96. Saved-run rows show only a champion flag — add a 48/64 format badge, the active preset's name, and relative time ("2h ago").

## Global (97–100)

97. Light theme CTAs (gold on cream) lose punch — deepen the gold and add a 1px inner border for light-mode buttons.
98. Keyboard focus falls back to default rings in places — unify a gold focus-ring token app-wide.
99. Empty states are text-only — add faint line-art (sleeping trophy, waiting draw balls) consistent across bracket, groups, and draw.
100. NumberFlow digits glide in some counters but not others — roll it out to every number that can change: scores, quotas, pulse stats, odds, pot averages.
