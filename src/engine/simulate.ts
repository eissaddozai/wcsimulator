import { NATION_BY_ID, ratingOf } from '../data/nations'
import { combinedFx, type CombinedFx } from './boosters'
import type { Rng } from './rng'
import { makeRng } from './rng'
import type { MatchResult } from './types'

/**
 * Hyper-realistic match model:
 *
 * 1. Every nation gets a stable attack/defense split around its rating — a deterministic
 *    per-nation style bias (flair sides score and concede more) plus a form kicker.
 * 2. Effective ratings absorb context: host home advantage, stage tension, and fatigue
 *    carried from a previous knockout that went to extra time or penalties.
 * 3. Elo win expectancy sets the strength edge; stage-calibrated total goals set the
 *    tempo (group 2.75 → final 2.2, bronze 3.1 — third-place games are open).
 * 4. Scorelines are drawn from a joint Poisson grid with the Dixon–Coles low-score
 *    correction (ρ < 0 boosts 0-0/1-1, trims 1-0/0-1), matching real draw rates.
 * 5. Extra time runs the same model at one-third tempo; shootouts are kick-by-kick.
 */

export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

export interface MatchContext {
  stage: MatchStage
  homeHost?: boolean
  awayHost?: boolean
  /** 1 = fresh; < 1 after a previous knockout went long (0.9 aet, 0.85 pens) */
  homeFreshness?: number
  awayFreshness?: number
}

export const GROUP_CTX: MatchContext = { stage: 'group' }

/** Average total goals by stage — knockout football tightens, bronze games open up. */
const STAGE_TEMPO: Record<MatchStage, number> = {
  group: 2.75,
  r32: 2.55,
  r16: 2.45,
  qf: 2.35,
  sf: 2.25,
  third: 3.1,
  final: 2.15,
}

const HOST_BOOST = 45 // Elo-scale home advantage for a host nation on home soil
const RHO = -0.13 // Dixon–Coles low-score correlation
const MAX_GOALS = 9

/** Deterministic per-nation style bias in [-1, 1]: positive = attacking, negative = solid. */
function styleOf(id: string): number {
  const r = makeRng(`style:${id}`)()
  const form = NATION_BY_ID.get(id)?.form ?? 0
  return Math.max(-1, Math.min(1, (r * 2 - 1) * 0.75 + form / 160))
}

const BIG_GAME_STAGES = new Set(['qf', 'sf', 'third', 'final'])

interface SideRatings {
  att: number
  def: number
  fx: CombinedFx
}

function effRatings(
  id: string,
  host: boolean,
  freshness: number,
  oppBase: number,
  stage: MatchStage,
): SideRatings {
  const fx = combinedFx(id)
  let base = ratingOf(id)
  if (oppBase - base >= 40) base += fx.underdog // sharpened against the mighty
  if (BIG_GAME_STAGES.has(stage)) base += fx.bigGame
  if (host) base += HOST_BOOST * fx.homeAmp
  const effFresh = 1 - (1 - freshness) * (1 - Math.max(fx.stamina, 0))
  base -= (1 - effFresh) * 160
  const bias = styleOf(id) * 22
  return { att: base + bias + fx.att, def: base - bias + fx.def, fx }
}

function poissonPmf(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

/** Dixon–Coles τ correction for the four low-score cells. */
function tau(h: number, a: number, lh: number, la: number): number {
  if (h === 0 && a === 0) return 1 - lh * la * RHO
  if (h === 1 && a === 0) return 1 + la * RHO
  if (h === 0 && a === 1) return 1 + lh * RHO
  if (h === 1 && a === 1) return 1 - RHO
  return 1
}

function sampleScore(lh: number, la: number, dixonColes: boolean, rng: Rng): { h: number; a: number } {
  const grid: number[] = []
  let total = 0
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = poissonPmf(lh, h) * poissonPmf(la, a) * (dixonColes ? tau(h, a, lh, la) : 1)
      grid.push(p)
      total += p
    }
  }
  let r = rng() * total
  for (let i = 0; i < grid.length; i++) {
    r -= grid[i]!
    if (r <= 0) return { h: Math.floor(i / (MAX_GOALS + 1)), a: i % (MAX_GOALS + 1) }
  }
  return { h: 0, a: 0 }
}

export function expectedGoals(
  homeId: string,
  awayId: string,
  ctx: MatchContext,
  theta: number,
): { lamHome: number; lamAway: number; edge: number; H: SideRatings; A: SideRatings } {
  const homeBase = ratingOf(homeId)
  const awayBase = ratingOf(awayId)
  const H = effRatings(homeId, ctx.homeHost ?? false, ctx.homeFreshness ?? 1, awayBase, ctx.stage)
  const A = effRatings(awayId, ctx.awayHost ?? false, ctx.awayFreshness ?? 1, homeBase, ctx.stage)
  // combined Elo-style edge from attack-vs-defense matchups
  const delta = ((H.att - A.def) + (H.def - A.att)) / 2
  const T = Math.pow(3, Math.min(Math.max(theta, 0), 2) - 1)
  const edge = Math.min(Math.max(delta / 175 / T, -1.6), 1.6)
  const tempo = STAGE_TEMPO[ctx.stage] * H.fx.tempo * A.fx.tempo
  // attack-leaning matchups raise the tempo a touch; mismatches raise it more
  const openness = 1 + 0.05 * (styleOf(homeId) + styleOf(awayId)) + 0.1 * Math.abs(edge)
  const mu = tempo * openness
  const lamHome = Math.min((mu / 2) * Math.exp(0.62 * edge), 5.5)
  const lamAway = Math.min((mu / 2) * Math.exp(-0.62 * edge), 5.5)
  return { lamHome, lamAway, edge, H, A }
}

export interface MatchOdds {
  home: number
  draw: number
  away: number
  lamHome: number
  lamAway: number
}

/** Exact 90-minute win/draw/win probabilities from the Dixon–Coles grid — powers the UI. */
export function matchOdds(homeId: string, awayId: string, ctx: MatchContext, theta: number): MatchOdds {
  const { lamHome, lamAway } = expectedGoals(homeId, awayId, ctx, theta)
  let home = 0
  let draw = 0
  let away = 0
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = poissonPmf(lamHome, h) * poissonPmf(lamAway, a) * tau(h, a, lamHome, lamAway)
      if (h > a) home += p
      else if (h === a) draw += p
      else away += p
    }
  }
  const total = home + draw + away
  return { home: home / total, draw: draw / total, away: away / total, lamHome, lamAway }
}

export function simulateMatch(
  homeId: string,
  awayId: string,
  ctx: MatchContext,
  theta: number,
  rng: Rng,
): MatchResult {
  const knockout = ctx.stage !== 'group'
  const { lamHome, lamAway, edge, H, A } = expectedGoals(homeId, awayId, ctx, theta)
  const { h, a } = sampleScore(lamHome, lamAway, true, rng)
  const result: MatchResult = { score: { home: h, away: a }, simulated: true }
  if (!knockout || h !== a) return result

  // extra time: one-third tempo, clutch boosters tilt it — no low-score correction
  const clutchTilt = Math.exp((0.3 * (H.fx.clutch - A.fx.clutch)) / 175)
  const et = sampleScore(
    Math.max((lamHome / 3) * clutchTilt, 0.08),
    Math.max((lamAway / 3) / clutchTilt, 0.08),
    false,
    rng,
  )
  result.et = { home: et.h, away: et.a }
  if (et.h !== et.a) return result

  result.pens = shootout(edge, H.fx.pens, A.fx.pens, rng)
  return result
}

function shootout(edge: number, pensHome: number, pensAway: number, rng: Rng): { home: number; away: number } {
  const clamp = (x: number) => Math.min(Math.max(x, 0.55), 0.92)
  const pHome = clamp(0.74 + 0.04 * Math.tanh(edge) + pensHome)
  const pAway = clamp(0.74 - 0.04 * Math.tanh(edge) + pensAway)
  let h = 0
  let a = 0
  for (let round = 1; round <= 5; round++) {
    if (rng() < pHome) h++
    if (rng() < pAway) a++
    const remaining = 5 - round
    if (h > a + remaining || a > h + remaining) return { home: h, away: a }
  }
  for (let round = 0; round < 30; round++) {
    const sh = rng() < pHome ? 1 : 0
    const sa = rng() < pAway ? 1 : 0
    h += sh
    a += sa
    if (sh !== sa) return { home: h, away: a }
  }
  return rng() < 0.5 ? { home: h + 1, away: a } : { home: h, away: a + 1 }
}

/** Winner of a knockout result (score + et + pens must decide; partial entries decide nothing). */
export function koWinner(homeId: string, awayId: string, r: MatchResult): string | null {
  if (r.score.home === null || r.score.away === null) return null
  let h = r.score.home
  let a = r.score.away
  if (h !== a) return h > a ? homeId : awayId
  if (r.et) {
    if (r.et.home === null || r.et.away === null) return null
    h += r.et.home
    a += r.et.away
    if (h !== a) return h > a ? homeId : awayId
  }
  if (r.pens && r.pens.home !== null && r.pens.away !== null && r.pens.home !== r.pens.away) {
    return r.pens.home > r.pens.away ? homeId : awayId
  }
  return null
}

export function koLoser(homeId: string, awayId: string, r: MatchResult): string | null {
  const w = koWinner(homeId, awayId, r)
  if (!w) return null
  return w === homeId ? awayId : homeId
}

export function stageOfMatch(n: number): MatchStage {
  if (n <= 72) return 'group'
  if (n <= 88) return 'r32'
  if (n <= 96) return 'r16'
  if (n <= 100) return 'qf'
  if (n <= 102) return 'sf'
  return n === 103 ? 'third' : 'final'
}
