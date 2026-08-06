import type { ModelParams } from '../engine/simulate'

export interface SliderSpec {
  key: keyof ModelParams
  label: string
  blurb: string
  min: number
  max: number
  step: number
  format: (v: number) => string
}

export interface SliderGroup {
  title: string
  tint: 'gold' | 'green' | 'blue' | 'amber' | 'red'
  items: SliderSpec[]
}

const x = (d = 1) => (v: number) => `×${v.toFixed(d)}`
const pctOf = (v: number) => `${Math.round(v * 100)}%`

/** The Laboratory's engine domains — 43 dials, grouped the way a coach would think about them. */
export const LAB_GROUPS: SliderGroup[] = [
  {
    title: 'Scoring & Tempo',
    tint: 'gold',
    items: [
      { key: 'tempo', label: 'Goal tempo', blurb: 'Global multiplier on total goals — 1990s slog to basketball.', min: 0.6, max: 1.6, step: 0.05, format: x(2) },
      { key: 'tension', label: 'Stage tension', blurb: 'How much knockout rounds tighten as the stakes rise.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'bronzeSpirit', label: 'Bronze spirit', blurb: 'The third-place match — cagey formality or joyous goal-fest.', min: 0.6, max: 1.6, step: 0.05, format: x(2) },
      { key: 'drawiness', label: 'Draw correction', blurb: 'Dixon–Coles coupling — 0 kills the extra 0-0s and 1-1s.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'scorelineCap', label: 'Scoreline ceiling', blurb: 'Maximum goals one side can score in 90 minutes.', min: 3, max: 9, step: 1, format: (v) => `${v}` },
      { key: 'lamCeiling', label: 'Scoring gravity', blurb: 'Soft ceiling that pulls monster expected-goal counts back to earth.', min: 1.8, max: 4, step: 0.1, format: (v) => v.toFixed(1) },
      { key: 'mismatchOpenness', label: 'Mismatch openness', blurb: 'How much David-vs-Goliath games open up.', min: 0, max: 0.3, step: 0.02, format: (v) => v.toFixed(2) },
      { key: 'styleOpenness', label: 'Style openness', blurb: 'Two attacking sides make for a wilder night.', min: 0, max: 0.15, step: 0.01, format: (v) => v.toFixed(2) },
    ],
  },
  {
    title: 'Strength & Upsets',
    tint: 'green',
    items: [
      { key: 'edgeWeight', label: 'Favorite bite', blurb: 'How hard rating differences translate into dominance.', min: 0.3, max: 1.0, step: 0.02, format: (v) => v.toFixed(2) },
      { key: 'edgeClamp', label: 'Dominance ceiling', blurb: 'The hard cap on how lopsided any match can get.', min: 1.0, max: 2.4, step: 0.1, format: (v) => v.toFixed(1) },
      { key: 'ratingSpread', label: 'Field spread', blurb: 'Compress the field toward parity, or stretch the class gaps.', min: 0.3, max: 1.5, step: 0.05, format: x(2) },
      { key: 'formWeight', label: 'Form weight', blurb: 'How loudly the last 12 months speak.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'styleInfluence', label: 'Style contrast', blurb: 'How much attacking/defensive identities skew scorelines.', min: 0, max: 2, step: 0.1, format: x() },
    ],
  },
  {
    title: 'Match Psychology',
    tint: 'amber',
    items: [
      { key: 'mercyRule', label: 'Game management', blurb: 'How hard big leads take the foot off the gas.', min: 0, max: 1.5, step: 0.1, format: x() },
      { key: 'chaseIntensity', label: 'Chase intensity', blurb: 'How hard a side one or two down throws itself forward.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'demoralization', label: 'Demoralization', blurb: 'Three or more down, how far heads drop.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'counterTendency', label: 'Counter tendency', blurb: 'Leading sides sharpen on the lightning break.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'underdogFire', label: 'Underdog fire', blurb: 'How fiercely minnows punch above their weight.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'giantNerves', label: 'Giant nerves', blurb: 'Heavy favorites tighten up when it is win-or-go-home.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'bigStageElite', label: 'Big-stage elites', blurb: 'Giants grow another head from the quarterfinals on.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'deadRubberEffect', label: 'Dead rubbers', blurb: 'MD3 games with nothing at stake turn loose and strange.', min: 0, max: 2, step: 0.1, format: x() },
    ],
  },
  {
    title: 'Context & Conditions',
    tint: 'blue',
    items: [
      { key: 'homeBoost', label: 'Host advantage', blurb: 'Elo points a host nation gains on home soil.', min: 0, max: 120, step: 5, format: (v) => `+${v}` },
      { key: 'fatigueImpact', label: 'Fatigue impact', blurb: 'The toll of extra time and shootouts on the next round.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'weatherInfluence', label: 'The elements', blurb: 'Heat slows it, rain levels it, altitude opens it up.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'etFatigue', label: 'Extra-time legs', blurb: 'How hard the legs go between minutes 91 and 120.', min: 0, max: 2, step: 0.1, format: x() },
    ],
  },
  {
    title: 'Discipline & Drama',
    tint: 'red',
    items: [
      { key: 'yellowRate', label: 'Booking rate', blurb: 'The referee corps baseline appetite for yellow cards.', min: 0.005, max: 0.05, step: 0.001, format: (v) => v.toFixed(3) },
      { key: 'redCardRate', label: 'Red card rate', blurb: 'Per-match chance of a sending-off — the real game runs near 9%.', min: 0, max: 0.4, step: 0.01, format: pctOf },
      { key: 'redImpact', label: 'Ten-man impact', blurb: 'How much a sending-off actually changes the match.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'refInfluence', label: 'Referee temperament', blurb: 'How much each appointed official shapes the cards.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'stoppageDrama', label: 'Stoppage drama', blurb: 'How much the 45th and 90th minutes boil.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'penAwardRate', label: 'Penalty awards', blurb: 'Per-match rate of in-game penalties won in the box.', min: 0, max: 0.6, step: 0.02, format: (v) => v.toFixed(2) },
      { key: 'saveDrama', label: 'Save drama', blurb: 'How many stops are worth remembering in the report.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'woodworkRate', label: 'Woodwork rate', blurb: 'Share of near-misses that rattle the frame.', min: 0, max: 0.1, step: 0.005, format: (v) => v.toFixed(3) },
    ],
  },
  {
    title: 'Extra Time & Shootouts',
    tint: 'gold',
    items: [
      { key: 'etTempo', label: 'Extra-time tempo', blurb: 'How much football is left in those 30 minutes.', min: 0.15, max: 0.6, step: 0.05, format: pctOf },
      { key: 'clutchWeight', label: 'Clutch weight', blurb: 'How decisive big-moment players are in extra time.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'penBase', label: 'Penalty conversion', blurb: 'Baseline chance any kick is scored.', min: 0.6, max: 0.88, step: 0.02, format: pctOf },
      { key: 'penPressure', label: 'Shootout pressure', blurb: 'How much team quality sways a shootout.', min: 0, max: 0.1, step: 0.01, format: (v) => v.toFixed(2) },
      { key: 'penKeeperWeight', label: 'Keeper factor', blurb: 'Shooter-vs-keeper quality showing up from twelve yards.', min: 0, max: 0.06, step: 0.01, format: (v) => v.toFixed(2) },
    ],
  },
  {
    title: 'Randomness & Miracles',
    tint: 'red',
    items: [
      { key: 'varianceBoost', label: 'Classic frequency', blurb: 'Chance a match erupts into an end-to-end classic.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'miracleRate', label: 'Miracle rate', blurb: 'Chance the underdog catches divine fire.', min: 0, max: 2, step: 0.1, format: x() },
    ],
  },
]

/* ————————————— calibration presets: a graded shelf from realism to arcade ————————————— */

export type PresetTier = 'simulation' | 'era' | 'drama' | 'arcade'

export const PRESET_TIERS: { id: PresetTier; name: string; blurb: string }[] = [
  { id: 'simulation', name: 'True to Life', blurb: 'Calibrated realism — honest reads of the modern game.' },
  { id: 'era', name: 'Eras & Styles', blurb: "History's football, faithfully bottled." },
  { id: 'drama', name: 'Heightened Drama', blurb: 'Real football, cinematic pressure.' },
  { id: 'arcade', name: 'Pure Arcade', blurb: 'The physics come off. Nobody is safe.' },
]

export interface ModelPreset {
  id: string
  name: string
  blurb: string
  tier: PresetTier
  params: Partial<ModelParams>
}

/**
 * Sixteen full calibrations. Except for the baseline, every preset governs the whole
 * board — all seven chambers, ~40 dials — so switching presets swaps worlds, not knobs.
 * Ordered within each tier from most to least sober.
 */
export const MODEL_PRESETS: ModelPreset[] = [
  /* ——— True to Life ——— */
  {
    id: 'fifa26',
    name: 'World Cup 26',
    blurb: 'The calibrated baseline — modern tournament football as the data reads it.',
    tier: 'simulation',
    params: {},
  },
  {
    id: 'coldread',
    name: 'The Cold Read',
    blurb: "An actuary's World Cup — variance trimmed, class honest, no romance.",
    tier: 'simulation',
    params: {
      tempo: 0.95, tension: 1.1, bronzeSpirit: 1.1, drawiness: 1.1, scorelineCap: 7, lamCeiling: 2.4,
      mismatchOpenness: 0.06, styleOpenness: 0.03, edgeWeight: 0.68, edgeClamp: 1.7, ratingSpread: 1.05,
      formWeight: 0.6, styleInfluence: 0.8, mercyRule: 1.2, chaseIntensity: 0.9, demoralization: 1.1,
      counterTendency: 1.1, underdogFire: 0.7, giantNerves: 0.2, bigStageElite: 0.4, deadRubberEffect: 0.3,
      homeBoost: 40, fatigueImpact: 1.1, weatherInfluence: 0.9, etFatigue: 1.1, yellowRate: 0.02,
      redCardRate: 0.08, redImpact: 1, refInfluence: 0.7, stoppageDrama: 0.8, penAwardRate: 0.2,
      saveDrama: 0.8, woodworkRate: 0.025, etTempo: 0.3, clutchWeight: 0.8, penBase: 0.76,
      penPressure: 0.05, penKeeperWeight: 0.02, varianceBoost: 0, miracleRate: 0,
    },
  },
  {
    id: 'primetime',
    name: 'Prime Time',
    blurb: 'Realism tuned for television — the same world with the microphone up.',
    tier: 'simulation',
    params: {
      tempo: 1.05, tension: 1.2, bronzeSpirit: 1.25, drawiness: 0.95, scorelineCap: 8, lamCeiling: 2.7,
      mismatchOpenness: 0.12, styleOpenness: 0.06, edgeWeight: 0.6, edgeClamp: 1.6, ratingSpread: 0.95,
      formWeight: 1.2, styleInfluence: 1.1, mercyRule: 0.9, chaseIntensity: 1.2, demoralization: 0.9,
      counterTendency: 1.2, underdogFire: 1.1, giantNerves: 0.5, bigStageElite: 0.6, deadRubberEffect: 0.8,
      homeBoost: 50, fatigueImpact: 1, weatherInfluence: 1, etFatigue: 1, yellowRate: 0.022,
      redCardRate: 0.1, redImpact: 1.1, refInfluence: 1.1, stoppageDrama: 1.4, penAwardRate: 0.24,
      saveDrama: 1.4, woodworkRate: 0.04, etTempo: 0.38, clutchWeight: 1.2, penBase: 0.74,
      penPressure: 0.05, penKeeperWeight: 0.02, varianceBoost: 0.5, miracleRate: 0.3,
    },
  },
  {
    id: 'grind',
    name: 'The Qualifier Grind',
    blurb: 'Tournament football played like a wet Tuesday eliminator — hostile, heavy, tight.',
    tier: 'simulation',
    params: {
      tempo: 0.85, tension: 1.3, bronzeSpirit: 0.9, drawiness: 1.4, scorelineCap: 6, lamCeiling: 2.3,
      mismatchOpenness: 0.07, styleOpenness: 0.03, edgeWeight: 0.56, edgeClamp: 1.45, ratingSpread: 0.9,
      formWeight: 1.3, styleInfluence: 0.9, mercyRule: 1.4, chaseIntensity: 1.1, demoralization: 0.8,
      counterTendency: 1.4, underdogFire: 1.3, giantNerves: 0.7, bigStageElite: 0.2, deadRubberEffect: 0.6,
      homeBoost: 75, fatigueImpact: 1.3, weatherInfluence: 1.5, etFatigue: 1.3, yellowRate: 0.03,
      redCardRate: 0.14, redImpact: 1.2, refInfluence: 1.4, stoppageDrama: 1.3, penAwardRate: 0.26,
      saveDrama: 1.1, woodworkRate: 0.035, etTempo: 0.28, clutchWeight: 1, penBase: 0.72,
      penPressure: 0.06, penKeeperWeight: 0.03, varianceBoost: 0.4, miracleRate: 0.4,
    },
  },
  {
    id: 'chalk',
    name: 'The Rankings Are Law',
    blurb: 'Prophecy football — giants finish their chances and never blink.',
    tier: 'simulation',
    params: {
      tempo: 1, tension: 0.8, bronzeSpirit: 1, drawiness: 0.7, scorelineCap: 8, lamCeiling: 2.9,
      mismatchOpenness: 0.14, styleOpenness: 0.04, edgeWeight: 0.92, edgeClamp: 2.4, ratingSpread: 1.3,
      formWeight: 0.3, styleInfluence: 0.7, mercyRule: 0.8, chaseIntensity: 0.8, demoralization: 1.4,
      counterTendency: 1.2, underdogFire: 0.3, giantNerves: 0, bigStageElite: 1.5, deadRubberEffect: 0.2,
      homeBoost: 35, fatigueImpact: 0.8, weatherInfluence: 0.6, etFatigue: 0.9, yellowRate: 0.019,
      redCardRate: 0.07, redImpact: 0.9, refInfluence: 0.6, stoppageDrama: 0.7, penAwardRate: 0.2,
      saveDrama: 0.7, woodworkRate: 0.025, etTempo: 0.32, clutchWeight: 1.3, penBase: 0.78,
      penPressure: 0.07, penKeeperWeight: 0.04, varianceBoost: 0, miracleRate: 0,
    },
  },

  /* ——— Eras & Styles ——— */
  {
    id: 'italia90',
    name: 'Italia 90',
    blurb: 'Cagey, cynical, gorgeous — 0-0 is a way of life and the cards fly.',
    tier: 'era',
    params: {
      tempo: 0.78, tension: 1.5, bronzeSpirit: 0.85, drawiness: 1.7, scorelineCap: 6, lamCeiling: 2.2,
      mismatchOpenness: 0.05, styleOpenness: 0.02, edgeWeight: 0.5, edgeClamp: 1.4, ratingSpread: 0.95,
      formWeight: 0.8, styleInfluence: 1.2, mercyRule: 1.5, chaseIntensity: 0.8, demoralization: 0.9,
      counterTendency: 1.6, underdogFire: 1.2, giantNerves: 1, bigStageElite: 0.3, deadRubberEffect: 0.4,
      homeBoost: 55, fatigueImpact: 1.2, weatherInfluence: 1.1, etFatigue: 1.4, yellowRate: 0.028,
      redCardRate: 0.16, redImpact: 1.3, refInfluence: 1.5, stoppageDrama: 1.1, penAwardRate: 0.14,
      saveDrama: 1.2, woodworkRate: 0.04, etTempo: 0.24, clutchWeight: 1.1, penBase: 0.68,
      penPressure: 0.07, penKeeperWeight: 0.05, varianceBoost: 0.3, miracleRate: 0.5,
    },
  },
  {
    id: 'mexico70',
    name: 'México 70',
    blurb: 'The beautiful game in its Sunday clothes — flowing, generous, unhurried.',
    tier: 'era',
    params: {
      tempo: 1.25, tension: 0.7, bronzeSpirit: 1.4, drawiness: 0.6, scorelineCap: 8, lamCeiling: 3.1,
      mismatchOpenness: 0.16, styleOpenness: 0.1, edgeWeight: 0.64, edgeClamp: 1.7, ratingSpread: 1.05,
      formWeight: 0.9, styleInfluence: 1.5, mercyRule: 0.4, chaseIntensity: 1.3, demoralization: 0.7,
      counterTendency: 1.1, underdogFire: 1, giantNerves: 0.2, bigStageElite: 0.9, deadRubberEffect: 1,
      homeBoost: 60, fatigueImpact: 0.9, weatherInfluence: 1.4, etFatigue: 1.1, yellowRate: 0.012,
      redCardRate: 0.05, redImpact: 0.9, refInfluence: 0.7, stoppageDrama: 1.1, penAwardRate: 0.18,
      saveDrama: 1.5, woodworkRate: 0.045, etTempo: 0.4, clutchWeight: 1.4, penBase: 0.76,
      penPressure: 0.04, penKeeperWeight: 0.02, varianceBoost: 0.8, miracleRate: 0.4,
    },
  },
  {
    id: 'catenaccio',
    name: 'The Iron Curtain',
    blurb: 'Catenaccio everywhere — one goal is a lead, and a lead is the match.',
    tier: 'era',
    params: {
      tempo: 0.68, tension: 1.6, bronzeSpirit: 0.8, drawiness: 1.9, scorelineCap: 5, lamCeiling: 2,
      mismatchOpenness: 0.03, styleOpenness: 0.01, edgeWeight: 0.58, edgeClamp: 1.5, ratingSpread: 1,
      formWeight: 0.7, styleInfluence: 1.4, mercyRule: 1.5, chaseIntensity: 0.7, demoralization: 1,
      counterTendency: 2, underdogFire: 1.1, giantNerves: 0.8, bigStageElite: 0.5, deadRubberEffect: 0.3,
      homeBoost: 50, fatigueImpact: 1.2, weatherInfluence: 0.9, etFatigue: 1.5, yellowRate: 0.033,
      redCardRate: 0.15, redImpact: 1.4, refInfluence: 1.2, stoppageDrama: 0.9, penAwardRate: 0.16,
      saveDrama: 1.6, woodworkRate: 0.05, etTempo: 0.2, clutchWeight: 1.2, penBase: 0.71,
      penPressure: 0.06, penKeeperWeight: 0.05, varianceBoost: 0.2, miracleRate: 0.3,
    },
  },
  {
    id: 'totalfootball',
    name: 'Total Football',
    blurb: 'Every outfielder an attacker, the press never sleeps, quality compounds.',
    tier: 'era',
    params: {
      tempo: 1.2, tension: 1, bronzeSpirit: 1.2, drawiness: 0.75, scorelineCap: 8, lamCeiling: 3,
      mismatchOpenness: 0.13, styleOpenness: 0.09, edgeWeight: 0.7, edgeClamp: 1.9, ratingSpread: 1.1,
      formWeight: 1.4, styleInfluence: 1.8, mercyRule: 0.5, chaseIntensity: 1.5, demoralization: 1.2,
      counterTendency: 1.5, underdogFire: 0.8, giantNerves: 0.3, bigStageElite: 1.1, deadRubberEffect: 0.7,
      homeBoost: 45, fatigueImpact: 1.4, weatherInfluence: 1, etFatigue: 1.3, yellowRate: 0.023,
      redCardRate: 0.1, redImpact: 1.2, refInfluence: 0.9, stoppageDrama: 1.2, penAwardRate: 0.26,
      saveDrama: 1.3, woodworkRate: 0.05, etTempo: 0.42, clutchWeight: 1.3, penBase: 0.75,
      penPressure: 0.05, penKeeperWeight: 0.03, varianceBoost: 0.7, miracleRate: 0.3,
    },
  },

  /* ——— Heightened Drama ——— */
  {
    id: 'drama',
    name: 'Knockout Drama',
    blurb: 'Every round a coronary — fine margins, heavy legs, pens forever.',
    tier: 'drama',
    params: {
      tempo: 0.95, tension: 1.7, bronzeSpirit: 1.1, drawiness: 1.5, scorelineCap: 7, lamCeiling: 2.5,
      mismatchOpenness: 0.09, styleOpenness: 0.05, edgeWeight: 0.55, edgeClamp: 1.5, ratingSpread: 0.9,
      formWeight: 1.1, styleInfluence: 1, mercyRule: 1.1, chaseIntensity: 1.6, demoralization: 0.6,
      counterTendency: 1.3, underdogFire: 1.4, giantNerves: 1.3, bigStageElite: 0.5, deadRubberEffect: 1,
      homeBoost: 55, fatigueImpact: 1.7, weatherInfluence: 1.2, etFatigue: 1.6, yellowRate: 0.027,
      redCardRate: 0.2, redImpact: 1.3, refInfluence: 1.3, stoppageDrama: 1.7, penAwardRate: 0.28,
      saveDrama: 1.6, woodworkRate: 0.055, etTempo: 0.36, clutchWeight: 1.9, penBase: 0.72,
      penPressure: 0.08, penKeeperWeight: 0.04, varianceBoost: 0.9, miracleRate: 0.8,
    },
  },
  {
    id: 'lateshow',
    name: 'The Late Show',
    blurb: 'Nothing is decided before the 88th minute — stoppage time is a genre.',
    tier: 'drama',
    params: {
      tempo: 1.02, tension: 1.3, bronzeSpirit: 1.2, drawiness: 1.25, scorelineCap: 7, lamCeiling: 2.7,
      mismatchOpenness: 0.1, styleOpenness: 0.06, edgeWeight: 0.58, edgeClamp: 1.55, ratingSpread: 0.95,
      formWeight: 1, styleInfluence: 1, mercyRule: 0.6, chaseIntensity: 1.9, demoralization: 0.4,
      counterTendency: 1.4, underdogFire: 1.3, giantNerves: 0.9, bigStageElite: 0.7, deadRubberEffect: 1.2,
      homeBoost: 50, fatigueImpact: 1.2, weatherInfluence: 1, etFatigue: 0.8, yellowRate: 0.024,
      redCardRate: 0.12, redImpact: 1.1, refInfluence: 1.1, stoppageDrama: 2, penAwardRate: 0.3,
      saveDrama: 1.5, woodworkRate: 0.05, etTempo: 0.5, clutchWeight: 1.7, penBase: 0.73,
      penPressure: 0.06, penKeeperWeight: 0.03, varianceBoost: 1.1, miracleRate: 1,
    },
  },
  {
    id: 'miracles',
    name: 'Cup of Miracles',
    blurb: 'Minnows breathe fire, giants hear footsteps, the gods pick sides.',
    tier: 'drama',
    params: {
      tempo: 1.05, tension: 1.2, bronzeSpirit: 1.2, drawiness: 0.9, scorelineCap: 8, lamCeiling: 2.8,
      mismatchOpenness: 0.14, styleOpenness: 0.07, edgeWeight: 0.46, edgeClamp: 1.35, ratingSpread: 0.6,
      formWeight: 1.5, styleInfluence: 1.1, mercyRule: 0.7, chaseIntensity: 1.6, demoralization: 0.5,
      counterTendency: 1.3, underdogFire: 2, giantNerves: 1.5, bigStageElite: 0, deadRubberEffect: 1.1,
      homeBoost: 65, fatigueImpact: 1.1, weatherInfluence: 1.3, etFatigue: 1, yellowRate: 0.024,
      redCardRate: 0.12, redImpact: 1.2, refInfluence: 1.2, stoppageDrama: 1.6, penAwardRate: 0.26,
      saveDrama: 1.7, woodworkRate: 0.06, etTempo: 0.4, clutchWeight: 1.5, penBase: 0.73,
      penPressure: 0.05, penKeeperWeight: 0.02, varianceBoost: 1.4, miracleRate: 1.8,
    },
  },
  {
    id: 'suddendeath',
    name: 'Sudden Death',
    blurb: 'Legs go, nerves fray, and twelve yards decide half the bracket.',
    tier: 'drama',
    params: {
      tempo: 0.88, tension: 2, bronzeSpirit: 1, drawiness: 1.6, scorelineCap: 6, lamCeiling: 2.3,
      mismatchOpenness: 0.06, styleOpenness: 0.03, edgeWeight: 0.54, edgeClamp: 1.45, ratingSpread: 0.9,
      formWeight: 0.9, styleInfluence: 0.9, mercyRule: 1.3, chaseIntensity: 1.2, demoralization: 0.8,
      counterTendency: 1.5, underdogFire: 1.2, giantNerves: 1.8, bigStageElite: 0.4, deadRubberEffect: 0.5,
      homeBoost: 50, fatigueImpact: 1.9, weatherInfluence: 1.1, etFatigue: 1.9, yellowRate: 0.029,
      redCardRate: 0.17, redImpact: 1.4, refInfluence: 1.2, stoppageDrama: 1.5, penAwardRate: 0.24,
      saveDrama: 1.8, woodworkRate: 0.05, etTempo: 0.26, clutchWeight: 1.8, penBase: 0.69,
      penPressure: 0.09, penKeeperWeight: 0.06, varianceBoost: 0.6, miracleRate: 0.7,
    },
  },

  /* ——— Pure Arcade ——— */
  {
    id: 'goalrush',
    name: 'Goal Rush',
    blurb: 'Everyone attacks, nobody defends, the nets need re-stringing nightly.',
    tier: 'arcade',
    params: {
      tempo: 1.5, tension: 0.5, bronzeSpirit: 1.6, drawiness: 0.3, scorelineCap: 9, lamCeiling: 3.6,
      mismatchOpenness: 0.24, styleOpenness: 0.12, edgeWeight: 0.62, edgeClamp: 1.8, ratingSpread: 1,
      formWeight: 1, styleInfluence: 1.3, mercyRule: 0.3, chaseIntensity: 1.5, demoralization: 0.6,
      counterTendency: 1.6, underdogFire: 1.1, giantNerves: 0.2, bigStageElite: 0.5, deadRubberEffect: 1.3,
      homeBoost: 55, fatigueImpact: 0.7, weatherInfluence: 0.8, etFatigue: 0.6, yellowRate: 0.015,
      redCardRate: 0.06, redImpact: 0.8, refInfluence: 0.7, stoppageDrama: 1.5, penAwardRate: 0.34,
      saveDrama: 1.4, woodworkRate: 0.06, etTempo: 0.55, clutchWeight: 1.2, penBase: 0.8,
      penPressure: 0.03, penKeeperWeight: 0.01, varianceBoost: 1.2, miracleRate: 0.6,
    },
  },
  {
    id: 'playground',
    name: 'Playground Rules',
    blurb: 'Jumpers for goalposts — no tactics, no cards, next goal wins.',
    tier: 'arcade',
    params: {
      tempo: 1.6, tension: 0.2, bronzeSpirit: 1.6, drawiness: 0.2, scorelineCap: 9, lamCeiling: 4,
      mismatchOpenness: 0.3, styleOpenness: 0.15, edgeWeight: 0.5, edgeClamp: 1.6, ratingSpread: 0.75,
      formWeight: 0.5, styleInfluence: 0.6, mercyRule: 0, chaseIntensity: 2, demoralization: 0.2,
      counterTendency: 1.8, underdogFire: 1.5, giantNerves: 0.1, bigStageElite: 0.2, deadRubberEffect: 1.6,
      homeBoost: 30, fatigueImpact: 0.4, weatherInfluence: 0.5, etFatigue: 0.3, yellowRate: 0.007,
      redCardRate: 0.02, redImpact: 0.6, refInfluence: 0.3, stoppageDrama: 1.8, penAwardRate: 0.45,
      saveDrama: 1.2, woodworkRate: 0.07, etTempo: 0.6, clutchWeight: 1, penBase: 0.84,
      penPressure: 0.02, penKeeperWeight: 0, varianceBoost: 1.8, miracleRate: 1.4,
    },
  },
  {
    id: 'pinball',
    name: 'Chaos Pinball',
    blurb: 'Class abolished, physics negotiable — the ball alone decides.',
    tier: 'arcade',
    params: {
      tempo: 1.3, tension: 0.6, bronzeSpirit: 1.3, drawiness: 0.5, scorelineCap: 9, lamCeiling: 3.4,
      mismatchOpenness: 0.2, styleOpenness: 0.1, edgeWeight: 0.34, edgeClamp: 1.1, ratingSpread: 0.35,
      formWeight: 0.2, styleInfluence: 0.5, mercyRule: 0.2, chaseIntensity: 1.7, demoralization: 0.3,
      counterTendency: 1.4, underdogFire: 2, giantNerves: 1.6, bigStageElite: 0, deadRubberEffect: 1.8,
      homeBoost: 20, fatigueImpact: 0.6, weatherInfluence: 1.6, etFatigue: 0.5, yellowRate: 0.02,
      redCardRate: 0.13, redImpact: 1, refInfluence: 1.6, stoppageDrama: 1.9, penAwardRate: 0.4,
      saveDrama: 1.5, woodworkRate: 0.09, etTempo: 0.5, clutchWeight: 0.6, penBase: 0.74,
      penPressure: 0.02, penKeeperWeight: 0, varianceBoost: 2, miracleRate: 2,
    },
  },
]
