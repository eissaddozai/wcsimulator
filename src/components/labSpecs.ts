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

/** The Laboratory's 26 engine domains, grouped the way a coach would think about them. */
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
    title: 'Context & Conditions',
    tint: 'blue',
    items: [
      { key: 'homeBoost', label: 'Host advantage', blurb: 'Elo points a host nation gains on home soil.', min: 0, max: 120, step: 5, format: (v) => `+${v}` },
      { key: 'fatigueImpact', label: 'Fatigue impact', blurb: 'The toll of extra time and shootouts on the next round.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'bigStageElite', label: 'Big-stage elites', blurb: 'Giants grow another head from the quarterfinals on.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'underdogFire', label: 'Underdog fire', blurb: 'How fiercely minnows punch above their weight.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'giantNerves', label: 'Giant nerves', blurb: 'Heavy favorites tighten up when it is win-or-go-home.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'deadRubberEffect', label: 'Dead rubbers', blurb: 'MD3 games with nothing at stake turn loose and strange.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'weatherInfluence', label: 'The elements', blurb: 'Heat slows it, rain levels it, altitude opens it up.', min: 0, max: 2, step: 0.1, format: x() },
    ],
  },
  {
    title: 'Extra Time & Shootouts',
    tint: 'amber',
    items: [
      { key: 'etTempo', label: 'Extra-time tempo', blurb: 'How much football is left in those 30 minutes.', min: 0.15, max: 0.6, step: 0.05, format: pctOf },
      { key: 'clutchWeight', label: 'Clutch weight', blurb: 'How decisive big-moment players are in extra time.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'penBase', label: 'Penalty conversion', blurb: 'Baseline chance any kick is scored.', min: 0.6, max: 0.88, step: 0.02, format: pctOf },
      { key: 'penPressure', label: 'Shootout pressure', blurb: 'How much team quality sways a shootout.', min: 0, max: 0.1, step: 0.01, format: (v) => v.toFixed(2) },
      { key: 'penKeeperWeight', label: 'Keeper factor', blurb: 'Shooter-vs-keeper quality showing up from twelve yards.', min: 0, max: 0.06, step: 0.01, format: (v) => v.toFixed(2) },
    ],
  },
  {
    title: 'Randomness & Drama',
    tint: 'red',
    items: [
      { key: 'varianceBoost', label: 'Classic frequency', blurb: 'Chance a match erupts into an end-to-end classic.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'redCardRate', label: 'Red card rate', blurb: 'Chance of a match-turning sending-off.', min: 0, max: 0.2, step: 0.01, format: pctOf },
      { key: 'miracleRate', label: 'Miracle rate', blurb: 'Chance the underdog catches divine fire.', min: 0, max: 2, step: 0.1, format: x() },
      { key: 'refInfluence', label: 'Referee temperament', blurb: 'How much each appointed official shapes the cards.', min: 0, max: 2, step: 0.1, format: x() },
    ],
  },
]

export interface ModelPreset {
  id: string
  name: string
  blurb: string
  params: Partial<ModelParams>
}

export const MODEL_PRESETS: ModelPreset[] = [
  { id: 'fifa26', name: 'World Cup 26', blurb: 'The calibrated default — modern tournament football.', params: {} },
  {
    id: 'italia90',
    name: 'Italia 90',
    blurb: 'Cagey, cynical, gorgeous. 0-0 is a way of life.',
    params: { tempo: 0.8, drawiness: 1.7, edgeWeight: 0.5, tension: 1.5, penBase: 0.68, giantNerves: 1 },
  },
  {
    id: 'goalrush',
    name: 'Goal Rush',
    blurb: 'Everyone attacks. Nobody defends. You love it.',
    params: { tempo: 1.45, drawiness: 0.3, styleOpenness: 0.12, mismatchOpenness: 0.24, varianceBoost: 1.2 },
  },
  {
    id: 'chalk',
    name: 'Pure Chalk',
    blurb: 'The rankings are prophecy. Giants do not blink.',
    params: { edgeWeight: 0.92, edgeClamp: 2.4, drawiness: 0.7, bigStageElite: 1.5, underdogFire: 0.3 },
  },
  {
    id: 'miracles',
    name: 'Cup of Miracles',
    blurb: 'Minnows breathe fire and the gods pick sides.',
    params: { underdogFire: 2, miracleRate: 1.8, varianceBoost: 1.4, ratingSpread: 0.6, giantNerves: 1.5 },
  },
  {
    id: 'drama',
    name: 'Knockout Drama',
    blurb: 'Every round is a coronary. Pens decide everything.',
    params: { tension: 1.7, fatigueImpact: 1.7, clutchWeight: 1.9, penPressure: 0.08, drawiness: 1.5, redCardRate: 0.08 },
  },
]
