import { NATION_BY_ID, ratingOf } from '../data/nations'
import { combinedFx, type CombinedFx } from './boosters'
import type { Rng } from './rng'
import { makeRng } from './rng'
import type { Weather } from './environment'
import type { MatchEvent, MatchResult } from './types'

/**
 * The match engine, in two layers:
 *
 * ANALYTIC LAYER (odds): attack/defense splits, Elo expectancy, stage tempo, and the
 * Dixon–Coles grid give exact probabilities for the odds panels.
 *
 * MINUTE ENGINE (simulation): every simulated match is played tick by tick through all
 * 90+ minutes. Each minute carries a time curve (late halves heat up, stoppage time is
 * drama), score-state momentum (trailing sides push, leaders shell up and counter),
 * yellow/red cards with second-yellow bookkeeping (a red permanently tilts the match),
 * in-match fatigue after the hour eased by stamina boosters, and accumulating xG,
 * shots, and possession. Extra time runs minutes 91–120 at the Lab's ET tempo with
 * clutch tilts; shootouts are kick-by-kick with pressure, keeper, and booster effects.
 */

export type MatchStage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

export interface MatchContext {
  stage: MatchStage
  homeHost?: boolean
  awayHost?: boolean
  /** 1 = fresh; < 1 after a previous knockout went long (0.9 aet, 0.85 pens) */
  homeFreshness?: number
  awayFreshness?: number
  /** MD3 fixture where both sides' fates are already sealed */
  deadRubber?: boolean
  /** deterministic per-match conditions from engine/environment */
  weather?: Weather
  refStrictness?: number
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

/**
 * Tunable model parameters — the Model Lab's sliders write here (via the store),
 * so the whole engine can be re-calibrated live.
 */
export interface ModelParams {
  // — scoring & tempo —
  tempo: number // global goals multiplier (default 1)
  tension: number // scales stage-to-stage tempo differences (0 = flat, default 1)
  bronzeSpirit: number // extra openness of the third-place match (default 1)
  drawiness: number // scales the Dixon–Coles draw correction (default 1)
  scorelineCap: number // maximum goals per team in a match (default 9)
  mismatchOpenness: number // how much mismatches raise total goals (default 0.1)
  styleOpenness: number // how much attacking styles raise total goals (default 0.05)
  // — strength & upsets —
  edgeWeight: number // how hard strength difference bites (default 0.62)
  edgeClamp: number // hard ceiling on the strength edge (default 1.6)
  ratingSpread: number // compress (<1) or stretch (>1) the field's quality gaps (default 1)
  formWeight: number // how much 12-month form colors a team's style (default 1)
  styleInfluence: number // scales attack/defense style splits (default 1)
  // — context & conditions —
  homeBoost: number // Elo points of host home advantage (default 45)
  fatigueImpact: number // scales the ET/pens fatigue penalty (default 1)
  bigStageElite: number // elite sides grow from the QF onward (default 0)
  underdogFire: number // scales underdog boosters + minnow inspiration (default 1)
  giantNerves: number // heavy favorites tighten up in knockouts (default 0)
  deadRubberEffect: number // MD3 games with nothing at stake loosen up (default 0)
  // — extra time & shootouts —
  etTempo: number // extra-time intensity as a share of normal (default 0.333)
  clutchWeight: number // scales clutch boosters in extra time (default 1)
  penBase: number // baseline penalty conversion (default 0.74)
  penPressure: number // how much team strength sways a shootout (default 0.04)
  penKeeperWeight: number // shooter-vs-keeper quality effect in shootouts (default 0)
  // — randomness & drama —
  varianceBoost: number // chance of a wild end-to-end classic (default 0)
  redCardRate: number // chance of a match-turning sending-off (default 0)
  miracleRate: number // chance the underdog catches divine fire (default 0)
  // — the elements —
  weatherInfluence: number // how much heat, rain, and altitude bend matches (default 1)
  refInfluence: number // how much the referee's temperament shapes the cards (default 1)
}

export const DEFAULT_MODEL: ModelParams = {
  tempo: 1,
  tension: 1,
  bronzeSpirit: 1,
  drawiness: 1,
  scorelineCap: 9,
  mismatchOpenness: 0.1,
  styleOpenness: 0.05,
  edgeWeight: 0.62,
  edgeClamp: 1.6,
  ratingSpread: 1,
  formWeight: 1,
  styleInfluence: 1,
  homeBoost: 45,
  fatigueImpact: 1,
  bigStageElite: 0,
  underdogFire: 1,
  giantNerves: 0,
  deadRubberEffect: 0,
  etTempo: 0.333,
  clutchWeight: 1,
  penBase: 0.74,
  penPressure: 0.04,
  penKeeperWeight: 0,
  varianceBoost: 0,
  redCardRate: 0,
  miracleRate: 0,
  weatherInfluence: 1,
  refInfluence: 1,
}

let MODEL: ModelParams = { ...DEFAULT_MODEL }

export function setModelParams(p: Partial<ModelParams>): void {
  MODEL = { ...DEFAULT_MODEL, ...p }
}

export function getModelParams(): ModelParams {
  return { ...MODEL }
}

const BASE_RHO = -0.13 // Dixon–Coles low-score correlation
const MAX_GOALS = 9

function goalCap(): number {
  return Math.min(Math.max(Math.round(MODEL.scorelineCap), 3), MAX_GOALS)
}

function rho(): number {
  return Math.max(BASE_RHO * MODEL.drawiness, -0.3)
}

/** Rating with the field-spread dial applied. */
function spreadRating(id: string): number {
  return 1500 + (ratingOf(id) - 1500) * MODEL.ratingSpread
}

/** Deterministic per-nation style bias in [-1, 1]: positive = attacking, negative = solid. */
function styleOf(id: string): number {
  const r = makeRng(`style:${id}`)()
  const form = NATION_BY_ID.get(id)?.form ?? 0
  return Math.max(-1, Math.min(1, (r * 2 - 1) * 0.75 + (form / 160) * MODEL.formWeight))
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
  let base = spreadRating(id)
  const raw = ratingOf(id)
  if (oppBase - base >= 40) base += fx.underdog * MODEL.underdogFire // sharpened against the mighty
  if (BIG_GAME_STAGES.has(stage)) {
    base += fx.bigGame
    base += ((raw - 1500) / 175) * 10 * MODEL.bigStageElite // elites rise on the big stage
  }
  if (host) base += MODEL.homeBoost * fx.homeAmp
  const effFresh = 1 - (1 - freshness) * (1 - Math.max(fx.stamina, 0))
  base -= (1 - effFresh) * 160 * MODEL.fatigueImpact
  const bias = styleOf(id) * 22 * MODEL.styleInfluence
  return { att: base + bias + fx.att, def: base - bias + fx.def, fx }
}

function poissonPmf(lambda: number, k: number): number {
  let p = Math.exp(-lambda)
  for (let i = 1; i <= k; i++) p *= lambda / i
  return p
}

/** Dixon–Coles τ correction for the four low-score cells. */
function tau(h: number, a: number, lh: number, la: number): number {
  const r = rho()
  if (h === 0 && a === 0) return Math.max(1 - lh * la * r, 0.05)
  if (h === 1 && a === 0) return Math.max(1 + la * r, 0.05)
  if (h === 0 && a === 1) return Math.max(1 + lh * r, 0.05)
  if (h === 1 && a === 1) return Math.max(1 - r, 0.05)
  return 1
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
  let edge = Math.min(Math.max(delta / 175 / T, -MODEL.edgeClamp), MODEL.edgeClamp)
  // heavy favorites can tighten up when it's win-or-go-home
  if (ctx.stage !== 'group' && MODEL.giantNerves > 0 && Math.abs(edge) > 0.6) {
    edge *= 1 - 0.25 * MODEL.giantNerves * Math.min(Math.abs(edge) - 0.6, 1)
  }
  if (ctx.deadRubber && MODEL.deadRubberEffect > 0) {
    edge *= 1 - 0.5 * Math.min(MODEL.deadRubberEffect, 1) // nobody's chasing anything
  }
  let stageTempo = STAGE_TEMPO.group + (STAGE_TEMPO[ctx.stage] - STAGE_TEMPO.group) * MODEL.tension
  if (ctx.stage === 'third') stageTempo *= MODEL.bronzeSpirit
  let tempo = stageTempo * MODEL.tempo * H.fx.tempo * A.fx.tempo
  // the elements: heat slows the game, altitude stretches legs and opens it up
  if (ctx.weather === 'heat') tempo *= 1 - 0.07 * MODEL.weatherInfluence
  if (ctx.weather === 'altitude') tempo *= 1 + 0.06 * MODEL.weatherInfluence
  if (ctx.deadRubber && MODEL.deadRubberEffect > 0) tempo *= 1 + 0.2 * MODEL.deadRubberEffect
  // attack-leaning matchups raise the tempo a touch; mismatches raise it more
  if (ctx.weather === 'rain') edge *= 1 - 0.12 * MODEL.weatherInfluence // a leveller
  const openness =
    1 + MODEL.styleOpenness * (styleOf(homeId) + styleOf(awayId)) + MODEL.mismatchOpenness * Math.abs(edge)
  const mu = tempo * openness
  const lamHome = Math.min((mu / 2) * Math.exp(MODEL.edgeWeight * edge), 5.5)
  const lamAway = Math.min((mu / 2) * Math.exp(-MODEL.edgeWeight * edge), 5.5)
  return { lamHome, lamAway, edge, H, A }
}

export interface MatchOdds {
  home: number
  draw: number
  away: number
  lamHome: number
  lamAway: number
}

export interface Scoreline {
  h: number
  a: number
  p: number
}

export interface DetailedOdds extends MatchOdds {
  /** knockout advance probability incl. extra time and penalties (exact draw split by ET/pens model) */
  advHome: number
  advAway: number
  topScorelines: Scoreline[]
  btts: number
  over25: number
  cleanSheetHome: number
  cleanSheetAway: number
  factors: { home: string[]; away: string[] }
}

/** Exact 90-minute win/draw/win probabilities from the Dixon–Coles grid — powers the UI. */
export function matchOdds(homeId: string, awayId: string, ctx: MatchContext, theta: number): MatchOdds {
  const { lamHome, lamAway } = expectedGoals(homeId, awayId, ctx, theta)
  let home = 0
  let draw = 0
  let away = 0
  const cap = goalCap()
  for (let h = 0; h <= cap; h++) {
    for (let a = 0; a <= cap; a++) {
      const p = poissonPmf(lamHome, h) * poissonPmf(lamAway, a) * tau(h, a, lamHome, lamAway)
      if (h > a) home += p
      else if (h === a) draw += p
      else away += p
    }
  }
  const total = home + draw + away
  return { home: home / total, draw: draw / total, away: away / total, lamHome, lamAway }
}

/** Everything the odds panel shows: full grid analytics + active model factors per side. */
export function detailedOdds(homeId: string, awayId: string, ctx: MatchContext, theta: number): DetailedOdds {
  const { lamHome, lamAway, edge, H, A } = expectedGoals(homeId, awayId, ctx, theta)
  let home = 0
  let draw = 0
  let away = 0
  let btts = 0
  let over25 = 0
  let cleanH = 0
  let cleanA = 0
  const lines: Scoreline[] = []
  let total = 0
  const cap = goalCap()
  for (let h = 0; h <= cap; h++) {
    for (let a = 0; a <= cap; a++) {
      const p = poissonPmf(lamHome, h) * poissonPmf(lamAway, a) * tau(h, a, lamHome, lamAway)
      total += p
      lines.push({ h, a, p })
      if (h > a) home += p
      else if (h === a) draw += p
      else away += p
      if (h > 0 && a > 0) btts += p
      if (h + a >= 3) over25 += p
      if (a === 0) cleanH += p
      if (h === 0) cleanA += p
    }
  }
  home /= total
  draw /= total
  away /= total
  // ET/pens split of a 90' draw: clutch tilts extra time, pens boosters tilt the shootout
  const clutchEdge = edge + (0.3 * (H.fx.clutch - A.fx.clutch) * MODEL.clutchWeight) / 175
  const etHomeShare = 0.5 + 0.35 * Math.tanh(0.8 * clutchEdge) + 0.5 * (H.fx.pens - A.fx.pens)
  const advHome = home + draw * Math.min(Math.max(etHomeShare, 0.1), 0.9)
  const factors = (id: string, host: boolean, fresh: number, fx: typeof H.fx): string[] => {
    const out: string[] = []
    if (host) out.push(`home advantage +${Math.round(MODEL.homeBoost * fx.homeAmp)}`)
    if (fresh < 1) out.push(`tired legs −${Math.round((1 - fresh) * 160 * MODEL.fatigueImpact)}`)
    const style = styleOf(id)
    if (Math.abs(style) > 0.25) out.push(style > 0 ? 'attacking style' : 'defensive style')
    const boosts = (combinedFx(id).att !== 0 || combinedFx(id).def !== 0 || fx.tempo !== 1 || fx.pens !== 0)
    if (boosts) out.push('boosters active')
    return out
  }
  return {
    home,
    draw,
    away,
    lamHome,
    lamAway,
    advHome,
    advAway: 1 - advHome,
    topScorelines: lines
      .map((l) => ({ ...l, p: l.p / total }))
      .sort((x, y) => y.p - x.p)
      .slice(0, 6),
    btts: btts / total,
    over25: over25 / total,
    cleanSheetHome: cleanH / total,
    cleanSheetAway: cleanA / total,
    factors: {
      home: factors(homeId, ctx.homeHost ?? false, ctx.homeFreshness ?? 1, H.fx),
      away: factors(awayId, ctx.awayHost ?? false, ctx.awayFreshness ?? 1, A.fx),
    },
  }
}

/** Per-minute time curve: halves heat up as they age; 45' and 90' are stoppage drama. */
function timeCurve(min: number): number {
  if (min === 45 || min === 90) return 1.7
  const half = min > 45 ? min - 45 : min
  return 0.82 + (half / 45) * 0.36
}

interface SideState {
  goals: number
  yellows: Set<number> // booked "player slots" 1..11
  red: boolean
  xg: number
  shots: number
}

/**
 * The minute engine. Plays every minute of the match as its own stochastic event:
 * shots arrive by a time-varying hazard, convert through sampled chance quality,
 * cards accumulate (second yellows walk), momentum swings with the scoreboard.
 */
export function simulateMatch(
  homeId: string,
  awayId: string,
  ctx: MatchContext,
  theta: number,
  rng: Rng,
): MatchResult {
  const knockout = ctx.stage !== 'group'
  let { lamHome, lamAway, edge, H, A } = expectedGoals(homeId, awayId, ctx, theta)
  // pre-match drama dials
  if (MODEL.varianceBoost > 0 && rng() < 0.12 * MODEL.varianceBoost) {
    lamHome *= 1.5
    lamAway *= 1.5 // an end-to-end classic breaks out
  }
  if (MODEL.miracleRate > 0 && rng() < 0.08 * MODEL.miracleRate) {
    if (lamHome < lamAway) lamHome *= 1.6
    else lamAway *= 1.6 // the underdog catches fire
  }

  const events: MatchEvent[] = []
  const home: SideState = { goals: 0, yellows: new Set(), red: false, xg: 0, shots: 0 }
  const away: SideState = { goals: 0, yellows: new Set(), red: false, xg: 0, shots: 0 }
  const cap = goalCap()

  // hazards per side-minute: intrinsic cards, the referee's temperament, the Lab's dial
  const refTemper = 1 + ((ctx.refStrictness ?? 1) - 1) * MODEL.refInfluence
  const yellowHazard = 0.021 * refTemper
  const directRedHazard = (0.0009 + MODEL.redCardRate / 110) * refTemper

  const playMinute = (min: number, intensity: number) => {
    const curve = timeCurve(Math.min(min, 90)) * intensity
    for (const [side, opp, lam, st, ost, fx] of [
      ['home', 'away', lamHome, home, away, H.fx],
      ['away', 'home', lamAway, away, home, A.fx],
    ] as const) {
      // score-state momentum: chasers push, leaders shell and counter
      const diff = st.goals - ost.goals
      let mood = 1
      if (diff < 0) mood = min > 60 ? 1.3 : 1.15 // chasing, desperate late
      else if (diff > 0) mood = 0.85 // seeing it out
      // numbers down
      let numbers = 1
      if (st.red) numbers *= 0.68
      if (ost.red) numbers *= 1.18
      // legs: after the hour, tired sides fade unless the bench is deep
      const legs = min > 60 ? 1 - 0.1 * (1 - Math.max(fx.stamina, 0)) * ((min - 60) / 30) : 1
      const pShot = (lam / 93) * 3.1 * curve * mood * numbers * legs
      if (rng() < pShot) {
        st.shots++
        const chanceQuality = Math.min(0.08 + -Math.log(1 - rng()) * 0.14, 0.85) // sampled xG
        st.xg += chanceQuality
        // conversion follows chance quality, calibrated so E[goals] tracks λ
        if (st.goals < cap && rng() < Math.min(chanceQuality * 1.48, 0.9)) {
          st.goals++
          events.push({ min, side, type: 'goal' })
        }
      }
      // discipline
      if (rng() < yellowHazard) {
        const player = 1 + Math.floor(rng() * 11)
        if (st.yellows.has(player) && !st.red) {
          st.red = true
          events.push({ min, side, type: 'red' }) // second yellow — off he goes
        } else {
          st.yellows.add(player)
          events.push({ min, side, type: 'yellow' })
        }
      } else if (!st.red && rng() < directRedHazard) {
        st.red = true
        events.push({ min, side, type: 'red' })
      }
      void opp
      void side
    }
  }

  for (let min = 1; min <= 90; min++) playMinute(min, 1)

  const result: MatchResult = {
    score: { home: home.goals, away: away.goals },
    simulated: true,
  }

  let decided = !knockout || home.goals !== away.goals
  if (!decided) {
    // extra time: minutes 91–120 at the Lab's ET tempo, clutch boosters tilting legs
    const clutchTilt = Math.exp((0.3 * (H.fx.clutch - A.fx.clutch) * MODEL.clutchWeight) / 175)
    const etIntensity = (MODEL.etTempo / 0.333) * 0.95
    const h0 = home.goals
    const a0 = away.goals
    const savedLamHome = lamHome
    lamHome *= clutchTilt
    lamAway /= clutchTilt
    for (let min = 91; min <= 120; min++) playMinute(min, etIntensity)
    lamHome = savedLamHome
    result.et = { home: home.goals - h0, away: away.goals - a0 }
    result.score = { home: h0, away: a0 }
    decided = home.goals !== away.goals
    if (!decided) result.pens = shootout(edge, H, A, rng)
  }

  const possBase = lamHome / (lamHome + lamAway)
  result.events = events
  result.stats = {
    xgHome: Math.round(home.xg * 100) / 100,
    xgAway: Math.round(away.xg * 100) / 100,
    shotsHome: home.shots,
    shotsAway: away.shots,
    possHome: Math.round((0.5 + (possBase - 0.5) * 0.72) * 100) / 100,
  }
  return result
}

function shootout(edge: number, H: SideRatings, A: SideRatings, rng: Rng): { home: number; away: number } {
  const clamp = (x: number) => Math.min(Math.max(x, 0.5), 0.95)
  const keeperH = MODEL.penKeeperWeight * Math.tanh((H.att - A.def) / 175)
  const keeperA = MODEL.penKeeperWeight * Math.tanh((A.att - H.def) / 175)
  const pHome = clamp(MODEL.penBase + MODEL.penPressure * Math.tanh(edge) + H.fx.pens + keeperH)
  const pAway = clamp(MODEL.penBase - MODEL.penPressure * Math.tanh(edge) + A.fx.pens + keeperA)
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
