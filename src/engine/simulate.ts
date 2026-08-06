import { NATION_BY_ID, ratingOf } from '../data/nations'
import { combinedFx, type CombinedFx } from './boosters'
import { starOf } from './campaign'
import type { Rng } from './rng'
import { makeRng } from './rng'
import type { Weather } from './environment'
import type { MatchEvent, MatchResult, MatchTag } from './types'

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
  /* — campaign systems (engine/campaign): all optional, all derived — */
  /** live tournament form drift in rating points (±35) */
  formHome?: number
  formAway?: number
  /** suspended-starter count from accumulated cards (0–3) */
  suspHome?: number
  suspAway?: number
  /** MD3 desperation: −1 dead rubber … +1 must-win */
  stakesHome?: number
  stakesAway?: number
  /** a derby from the rivalry table — bite, cards, and variance */
  rivalry?: boolean
  /** host-advantage multiplier that grows round by round */
  hostSurge?: number
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
  // — realism governors —
  mercyRule: number // how hard big leads take the foot off the gas (default 1)
  lamCeiling: number // soft ceiling that pulls monster expected-goal counts to earth (default 2.6)
  convFatigue: number // finishing regression once a side is three up (default 1)
  demoralization: number // how far heads drop three or more down (default 1)
  chaseIntensity: number // how hard sides a goal or two down push (default 1)
  redImpact: number // how much ten men change a match (default 1)
  counterTendency: number // leading sides sharpen on the break (default 1)
  etFatigue: number // how hard legs go in extra time (default 1)
  // — randomness & drama —
  varianceBoost: number // chance of a wild end-to-end classic (default 0)
  redCardRate: number // per-match chance of a sending-off (default 0.09)
  yellowRate: number // per-side-per-minute booking hazard (default 0.021)
  stoppageDrama: number // how much the 45th and 90th minutes boil (default 1)
  penAwardRate: number // per-match rate of in-game penalty awards (default 0.22)
  saveDrama: number // how many saves are worth remembering (default 1)
  woodworkRate: number // share of near-misses that rattle the frame (default 0.03)
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
  mercyRule: 1,
  lamCeiling: 2.6,
  convFatigue: 1,
  demoralization: 1,
  chaseIntensity: 1,
  redImpact: 1,
  counterTendency: 1,
  etFatigue: 1,
  varianceBoost: 0,
  redCardRate: 0.09,
  yellowRate: 0.021,
  stoppageDrama: 1,
  penAwardRate: 0.22,
  saveDrama: 1,
  woodworkRate: 0.03,
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

/** Dixon–Coles τ correction for the four low-score cells; knockout tension firms the draw tail. */
function tau(h: number, a: number, lh: number, la: number, knockout = false): number {
  const r = rho() * (knockout ? 1.18 : 1)
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
  // campaign systems: live form drift lifts or drags; suspensions dent a starting XI
  const campaign = (S: SideRatings, form: number | undefined, susp: number | undefined, host: boolean) => {
    const adj = (form ?? 0) - 14 * (susp ?? 0)
    S.att += adj
    S.def += adj
    // the host surge: home advantage grows round by round
    if (host && ctx.hostSurge && ctx.hostSurge > 1) {
      const extra = MODEL.homeBoost * (ctx.hostSurge - 1) * S.fx.homeAmp
      S.att += extra
      S.def += extra
    }
  }
  campaign(H, ctx.formHome, ctx.suspHome, ctx.homeHost ?? false)
  campaign(A, ctx.formAway, ctx.suspAway, ctx.awayHost ?? false)
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
  // scoring gravity: expected goals compress hard above the ceiling — 8-0 should be
  // a once-a-generation event, not a fixture of every mismatch
  const gravity = (lam: number): number =>
    lam > MODEL.lamCeiling ? MODEL.lamCeiling + (lam - MODEL.lamCeiling) * 0.5 : lam
  const lamHome = gravity(Math.min((mu / 2) * Math.exp(MODEL.edgeWeight * edge), 5.5))
  const lamAway = gravity(Math.min((mu / 2) * Math.exp(-MODEL.edgeWeight * edge), 5.5))
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
      const p = poissonPmf(lamHome, h) * poissonPmf(lamAway, a) * tau(h, a, lamHome, lamAway, ctx.stage !== 'group')
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
      const p = poissonPmf(lamHome, h) * poissonPmf(lamAway, a) * tau(h, a, lamHome, lamAway, ctx.stage !== 'group')
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
  if (min === 45 || min === 90) return 1 + 0.7 * MODEL.stoppageDrama
  const half = min > 45 ? min - 45 : min
  return 0.82 + (half / 45) * 0.36
}

/** How the goal arrived — weighted like real tournament football. Pressure breeds own goals. */
function goalDetail(rng: Rng, diff: number, underPressure = false): import('./types').GoalDetail {
  const r = rng()
  const counterW = diff > 0 ? 0.1 + 0.1 * MODEL.counterTendency : 0.1
  const ogW = underPressure ? 0.06 : 0.03
  if (r < ogW) return 'og'
  if (r < ogW + 0.18) return 'header'
  if (r < ogW + 0.18 + 0.1) return 'setpiece'
  if (r < ogW + 0.18 + 0.1 + 0.05) return 'freekick'
  if (r < ogW + 0.18 + 0.1 + 0.05 + 0.09) return 'longrange'
  if (r < ogW + 0.18 + 0.1 + 0.05 + 0.09 + counterW) return 'counter'
  return 'openplay'
}

interface SideState {
  goals: number
  yellows: Set<number> // booked "player slots" 1..11
  red: boolean
  xg: number
  shots: number
  /** knocks suffered — each one saps the legs a little */
  knocks: number
  /** substitutions made (max 3) — fresh legs slow the late fade */
  subs: number
  /** minutes at which this side conceded — feeds the panic response */
  concededAt: number[]
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
  // a derby carries its own weather — bite, noise, variance
  if (ctx.rivalry) {
    const tilt = 0.96 + rng() * 0.08
    lamHome *= 1.04 * tilt
    lamAway *= 1.04 * (2 - tilt)
  }
  // giant nerves, auto-contextual: colossal knockout favorites tighten on their own
  if (knockout && Math.abs(edge) > 1.0) {
    if (edge > 0) lamHome *= 0.97
    else lamAway *= 0.97
  }
  // MD3 stakes: a must-win side pushes; a safe side rotates
  const stakeMood = (s: number | undefined) => (s === undefined ? 1 : 1 + 0.1 * s)
  lamHome *= stakeMood(ctx.stakesHome)
  lamAway *= stakeMood(ctx.stakesAway)

  const events: MatchEvent[] = []
  const home: SideState = { goals: 0, yellows: new Set(), red: false, xg: 0, shots: 0, knocks: 0, subs: 0, concededAt: [] }
  const away: SideState = { goals: 0, yellows: new Set(), red: false, xg: 0, shots: 0, knocks: 0, subs: 0, concededAt: [] }
  const cap = goalCap()
  const starH = starOf(homeId)
  const starA = starOf(awayId)

  // hazards per side-minute: intrinsic cards, the referee's temperament, the Lab's dial
  const refTemper = 1 + ((ctx.refStrictness ?? 1) - 1) * MODEL.refInfluence
  const baseYellowHazard = MODEL.yellowRate * refTemper * (ctx.rivalry ? 1.35 : 1)
  const directRedHazard = (MODEL.redCardRate / 95) * refTemper // per-match probability, spread over the minutes

  // the match's moving parts: momentum, referee flashpoints, red-card shock
  let mom = 0 // −1 away storm … +1 home storm
  const momLog: number[] = []
  let heatUntil = 0 // cards breed cards for a spell
  let shockUntil = 0 // a red chills the game for five minutes
  const flashpoint = (min: number) => {
    heatUntil = min + 8
  }

  const playMinute = (min: number, intensity: number, plus = 0) => {
    mom *= 0.93
    let curve = timeCurve(Math.min(min, 90)) * intensity
    if (min < shockUntil) curve *= 0.85 // the shock of a sending-off
    const cardHeat = min < heatUntil ? (refTemper > 1 ? 1.7 : 1.25) : 1
    for (const [side, lam, st, ost, fx, star] of [
      ['home', lamHome, home, away, H.fx, starH],
      ['away', lamAway, away, home, A.fx, starA],
    ] as const) {
      const sideSign = side === 'home' ? 1 : -1
      // score-state mood: chasers push, leaders shell and counter
      const diff = st.goals - ost.goals
      let mood = 1
      if (diff < 0) {
        mood =
          -diff <= 2
            ? 1 + (min > 60 ? 0.3 : 0.15) * MODEL.chaseIntensity
            : 1 - 0.15 * MODEL.demoralization
      } else if (diff > 0) {
        const eased = [1, 0.85, 0.7, 0.56, 0.45][Math.min(diff, 4)]!
        mood = 1 - (1 - eased) * MODEL.mercyRule
      }
      // momentum rides with the side that's storming
      mood *= Math.min(Math.max(1 + 0.22 * mom * sideSign, 0.75), 1.3)
      // the panic response: two conceded inside ten minutes rattles the defense
      const oppPanicked = ost.concededAt.filter((m) => min - m <= 10).length >= 2
      if (oppPanicked) mood *= 1.15
      // numbers down
      let numbers = 1
      if (st.red) numbers *= 1 - 0.32 * MODEL.redImpact
      if (ost.red) numbers *= 1 + 0.18 * MODEL.redImpact
      // legs: fatigue, knocks, and the bench — subs slow the fade
      const bench = Math.max(fx.stamina, 0) + st.subs * 0.05
      let legs = min > 60 ? 1 - 0.1 * (1 - Math.min(bench, 0.9)) * ((min - 60) / 30) : 1
      legs *= 1 - 0.05 * st.knocks
      if (min > 90) legs *= 1 - 0.15 * MODEL.etFatigue * ((min - 90) / 30)
      // late rain: the pitch slickens after the hour
      const slick = ctx.weather === 'rain' && min > 60 ? 1.05 * MODEL.weatherInfluence ** 0.5 : 1
      const pShot = (lam / 93) * 3.1 * curve * mood * numbers * legs * slick
      if (rng() < pShot) {
        st.shots++
        let chanceQuality = Math.min(0.08 + -Math.log(1 - rng()) * 0.14, 0.85) // sampled xG
        if (diff > 0) chanceQuality = Math.min(chanceQuality * (1 + 0.08 * MODEL.counterTendency), 0.88)
        // the talisman decides late moments
        if (min >= 78) chanceQuality = Math.min(chanceQuality * (1 + 0.12 * star), 0.9)
        st.xg += chanceQuality
        const convFade = Math.pow(1 - 0.12 * MODEL.convFatigue, Math.max(0, st.goals - 2))
        const slickConv = ctx.weather === 'rain' && min > 60 ? 0.96 : 1
        if (st.goals < cap && rng() < Math.min(chanceQuality * 1.48 * convFade * slickConv, 0.9)) {
          // VAR: some of these don't survive the review
          if (rng() < 0.035) {
            events.push({ min, plus: plus || undefined, side, type: 'var', xg: Math.round(chanceQuality * 100) / 100 })
          } else {
            st.goals++
            ost.concededAt.push(min)
            mom = Math.min(Math.max(mom + 0.6 * sideSign, -1), 1)
            events.push({
              min,
              plus: plus || undefined,
              side,
              type: 'goal',
              detail: goalDetail(rng, diff, oppPanicked),
              xg: Math.round(chanceQuality * 100) / 100,
            })
          }
        } else {
          const miss = rng()
          if (miss < MODEL.woodworkRate) events.push({ min, plus: plus || undefined, side, type: 'woodwork' })
          else if (chanceQuality > 0.42 && miss < MODEL.woodworkRate + 0.35) {
            mom = Math.min(Math.max(mom - 0.12 * sideSign, -1), 1) // the big one that got away
            events.push({ min, plus: plus || undefined, side, type: 'miss', xg: Math.round(chanceQuality * 100) / 100 })
          } else if (chanceQuality > 0.3 && miss < MODEL.woodworkRate + 0.35 + 0.5 * MODEL.saveDrama)
            events.push({ min, plus: plus || undefined, side, type: 'bigsave' })
        }
      }
      // an in-game penalty: won in the box, taken from the spot
      if (MODEL.penAwardRate > 0 && rng() < (MODEL.penAwardRate / 190) * curve) {
        st.shots++
        st.xg += 0.78
        const conv = Math.min(Math.max(MODEL.penBase + fx.pens, 0.5), 0.95)
        if (st.goals < cap && rng() < conv) {
          st.goals++
          ost.concededAt.push(min)
          mom = Math.min(Math.max(mom + 0.6 * sideSign, -1), 1)
          events.push({ min, plus: plus || undefined, side, type: 'goal', detail: 'pen', xg: 0.78 })
        } else {
          mom = Math.min(Math.max(mom - 0.15 * sideSign, -1), 1)
          events.push({ min, plus: plus || undefined, side, type: 'penmiss' })
        }
      }
      // knocks: heavy legs invite injuries, and every knock saps the side
      if (rng() < 0.0011 * (min > 55 ? 1.4 : 1)) {
        st.knocks++
        events.push({ min, plus: plus || undefined, side, type: 'injury' })
      }
      // the bench: half-time changes, the hour, and the final roll
      if (st.subs < 3 && plus === 0) {
        const window =
          (min === 46 && rng() < 0.5) || (min === 64 && rng() < 0.8) || (min === 82 && rng() < 0.65)
        if (window) {
          st.subs++
          events.push({ min, side, type: 'sub' })
        }
      }
      // discipline — flashpoints breed cards
      if (rng() < baseYellowHazard * cardHeat) {
        const player = 1 + Math.floor(rng() * 11)
        flashpoint(min)
        if (st.yellows.has(player) && !st.red) {
          st.red = true
          shockUntil = min + 5
          mom = Math.min(Math.max(mom - 0.4 * sideSign, -1), 1)
          events.push({ min, plus: plus || undefined, side, type: 'red' }) // second yellow — off he goes
        } else {
          st.yellows.add(player)
          events.push({ min, plus: plus || undefined, side, type: 'yellow' })
        }
      } else if (!st.red && rng() < directRedHazard) {
        st.red = true
        flashpoint(min)
        shockUntil = min + 5
        mom = Math.min(Math.max(mom - 0.4 * sideSign, -1), 1)
        events.push({ min, plus: plus || undefined, side, type: 'red' })
      }
    }
    if (min % 5 === 0 && plus === 0) momLog.push(Math.round(mom * 100) / 100)
  }

  // the ninety, with real stoppage time at the end of each half
  const eventCountAt = () => events.length
  let firstHalfEvents = 0
  for (let min = 1; min <= 90; min++) {
    playMinute(min, 1)
    if (min === 45) {
      firstHalfEvents = eventCountAt()
      const added = Math.min(1 + Math.floor(firstHalfEvents / 4) + (rng() < 0.4 ? 1 : 0), 5)
      for (let k = 1; k <= added; k++) playMinute(45, 1, k)
    }
    if (min === 90) {
      const secondHalfEvents = eventCountAt() - firstHalfEvents
      const added = Math.min(2 + Math.floor(secondHalfEvents / 4) + (rng() < 0.5 ? 1 : 0), 7)
      for (let k = 1; k <= added; k++) playMinute(90, 1, k)
    }
  }

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
    if (!decided) {
      const so = shootout(edge, H, A, rng, {
        starH,
        starA,
        hostH: ctx.homeHost ?? false,
        hostA: ctx.awayHost ?? false,
      })
      result.pens = { home: so.home, away: so.away }
      result.pensDetail = { home: so.seqHome, away: so.seqAway }
    }
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
  result.momentum = momLog
  result.tags = computeTags(result, home, away, edge, ctx.rivalry ?? false, events)
  return result
}

/** The match labels itself: rout, thriller, comeback, shock, smash-and-grab, siege… */
function computeTags(
  r: MatchResult,
  home: SideState,
  away: SideState,
  edge: number,
  rivalry: boolean,
  events: MatchEvent[],
): MatchTag[] {
  const tags: MatchTag[] = []
  const h = (r.score.home ?? 0) + (r.et?.home ?? 0)
  const a = (r.score.away ?? 0) + (r.et?.away ?? 0)
  const margin = Math.abs(h - a)
  const total = h + a
  const winnerSide: 'home' | 'away' | null =
    h > a ? 'home' : a > h ? 'away' : r.pens && r.pens.home !== r.pens.away ? (r.pens.home! > r.pens.away! ? 'home' : 'away') : null

  // replay the goals to find the winner's deepest deficit and the decisive minute
  let hs = 0
  let as = 0
  let deepest = 0
  let lastGoalMin = 0
  for (const e of events) {
    if (e.type !== 'goal') continue
    if (e.side === 'home') hs++
    else as++
    lastGoalMin = e.min + (e.plus ?? 0) / 10
    if (winnerSide === 'home') deepest = Math.max(deepest, as - hs)
    if (winnerSide === 'away') deepest = Math.max(deepest, hs - as)
  }

  if (rivalry) tags.push('derby')
  if (margin >= 4) tags.push('rout')
  if (winnerSide && deepest >= 2) tags.push('comeback')
  if (winnerSide && margin === 1 && lastGoalMin >= 85) tags.push('late-show')
  if (total >= 5 && margin <= 1) tags.push('thriller')
  if (winnerSide && Math.abs(edge) > 0.55) {
    const favorite = edge > 0 ? 'home' : 'away'
    if (winnerSide !== favorite) tags.push('shock')
  }
  if (winnerSide) {
    const wXg = winnerSide === 'home' ? home.xg : away.xg
    const lXg = winnerSide === 'home' ? away.xg : home.xg
    const wShots = winnerSide === 'home' ? home.shots : away.shots
    const lShots = winnerSide === 'home' ? away.shots : home.shots
    if (lXg - wXg > 0.8) tags.push('smash-and-grab')
    else if (lShots - wShots >= 8) tags.push('siege')
  }
  if (r.pensDetail && r.pensDetail.home.length >= 8) tags.push('marathon')
  return tags.slice(0, 3)
}

function shootout(
  edge: number,
  H: SideRatings,
  A: SideRatings,
  rng: Rng,
  opts: { starH: number; starA: number; hostH: boolean; hostA: boolean } = {
    starH: 0,
    starA: 0,
    hostH: false,
    hostA: false,
  },
): { home: number; away: number; seqHome: boolean[]; seqAway: boolean[] } {
  const clamp = (x: number) => Math.min(Math.max(x, 0.45), 0.96)
  const keeperH = MODEL.penKeeperWeight * Math.tanh((H.att - A.def) / 175)
  const keeperA = MODEL.penKeeperWeight * Math.tanh((A.att - H.def) / 175)
  const baseHome =
    MODEL.penBase + MODEL.penPressure * Math.tanh(edge) + H.fx.pens + keeperH + (opts.hostH ? 0.015 : 0)
  const baseAway =
    MODEL.penBase - MODEL.penPressure * Math.tanh(edge) + A.fx.pens + keeperA + (opts.hostA ? 0.015 : 0)
  const seqHome: boolean[] = []
  const seqAway: boolean[] = []
  // kick psychology: the star opens above base, kicks 4–5 sag, sudden death decays,
  // and a keeper who just saved flies for the next one
  const kickP = (base: number, kick: number, star: number, keeperJustSaved: boolean): number => {
    let p = base
    if (kick === 1) p += 0.04 + 0.03 * star
    if (kick === 4 || kick === 5) p -= 0.05
    if (kick > 5) p -= 0.012 * (kick - 5)
    if (keeperJustSaved) p -= 0.04
    return clamp(p)
  }
  let h = 0
  let a = 0
  let keeperHomeHot = false // the away keeper saved home's last kick
  let keeperAwayHot = false
  const kick = (round: number): { sh: boolean; sa: boolean } => {
    const sh = rng() < kickP(baseHome, round, opts.starH, keeperHomeHot)
    const sa = rng() < kickP(baseAway, round, opts.starA, keeperAwayHot)
    keeperHomeHot = !sh
    keeperAwayHot = !sa
    seqHome.push(sh)
    seqAway.push(sa)
    if (sh) h++
    if (sa) a++
    return { sh, sa }
  }
  for (let round = 1; round <= 5; round++) {
    kick(round)
    const remaining = 5 - round
    if (h > a + remaining || a > h + remaining) return { home: h, away: a, seqHome, seqAway }
  }
  for (let round = 6; round < 36; round++) {
    const { sh, sa } = kick(round)
    if (sh !== sa) return { home: h, away: a, seqHome, seqAway }
  }
  if (rng() < 0.5) {
    seqHome.push(true)
    seqAway.push(false)
    return { home: h + 1, away: a, seqHome, seqAway }
  }
  seqHome.push(false)
  seqAway.push(true)
  return { home: h, away: a + 1, seqHome, seqAway }
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

/** Stage of match n under either format's numbering. */
export function stageOfMatchFor(n: number, format: 48 | 64): MatchStage {
  if (format === 48) return stageOfMatch(n)
  if (n <= 96) return 'group'
  if (n <= 112) return 'r32'
  if (n <= 120) return 'r16'
  if (n <= 124) return 'qf'
  if (n <= 126) return 'sf'
  return n === 127 ? 'third' : 'final'
}
