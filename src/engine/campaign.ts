import { ratingOf } from '../data/nations'
import type { BracketState } from './bracket'
import { groupFixturesFor, koRangeFor } from './schedule'
import { isScored, type Format, type MatchResult } from './types'

/**
 * Campaign systems: everything a tournament remembers between matches —
 * live form drift, accumulated discipline, matchday-three stakes, rivalry heat,
 * star quality, and the host nation's growing surge. All derived, all seeded,
 * nothing stored.
 */

/* ————— rivalry heat ————— */

const RIVALRY_PAIRS: [string, string][] = [
  ['ARG', 'BRA'], ['ARG', 'ENG'], ['ARG', 'URU'], ['BRA', 'URU'],
  ['ENG', 'GER'], ['ENG', 'SCO'], ['GER', 'NED'], ['FRA', 'ITA'],
  ['ESP', 'POR'], ['USA', 'MEX'], ['JPN', 'KOR'], ['ALG', 'EGY'],
  ['NGA', 'GHA'], ['MAR', 'ALG'], ['IRN', 'KSA'], ['AUS', 'NZL'],
  ['SWE', 'DEN'], ['CRO', 'SRB'], ['POL', 'GER'], ['CHI', 'PER'],
]
const RIVALRY_KEYS = new Set(RIVALRY_PAIRS.map(([a, b]) => [a, b].sort().join('-')))

export function isRivalry(a: string, b: string): boolean {
  return RIVALRY_KEYS.has([a, b].sort().join('-'))
}

/* ————— star quality ————— */

/** The talisman factor in [0,1]: how likely this nation is to carry a match-deciding star. */
export function starOf(id: string): number {
  return Math.min(Math.max((ratingOf(id) - 1850) / 300, 0), 1)
}

/* ————— host surge ————— */

/** Home advantage grows as the host survives — the country dares to dream. */
export const HOST_SURGE: Record<string, number> = {
  group: 1,
  r32: 1.06,
  r16: 1.12,
  qf: 1.18,
  sf: 1.26,
  third: 1.18,
  final: 1.35,
}

/* ————— live tournament form ————— */

export interface CampaignSources {
  /** group slots keyed by group id, position-ordered (nullable while forming) */
  groups: Record<string, (string | null)[]>
  results: Record<number, MatchResult>
  bracket: BracketState | null
  format: Format
}

/**
 * Elo-style in-tournament drift: wins push a side's live strength up, losses drag it
 * down, knockouts weigh heavier — so runs and slumps compound. Clamped to ±35 pts.
 */
export function formDriftOf(teamId: string, src: CampaignSources): number {
  let drift = 0
  for (const f of groupFixturesFor(src.format)) {
    const home = src.groups[f.group]?.[f.homePos - 1]
    const away = src.groups[f.group]?.[f.awayPos - 1]
    if (home !== teamId && away !== teamId) continue
    const r = src.results[f.number]
    if (!r || !isScored(r)) continue
    const mine = home === teamId ? r.score.home! : r.score.away!
    const theirs = home === teamId ? r.score.away! : r.score.home!
    drift += mine > theirs ? 5 : mine === theirs ? 1 : -5
  }
  if (src.bracket) {
    const [from, to] = koRangeFor(src.format)
    for (let n = from; n <= to; n++) {
      const m = src.bracket[n]
      if (!m || (m.home !== teamId && m.away !== teamId) || !m.winner || m.stale) continue
      drift += m.winner === teamId ? 7 : -7
    }
  }
  return Math.min(Math.max(drift, -35), 35)
}

/* ————— the suspension engine ————— */

/**
 * Absence burden before match n: accumulated yellows suspend players (every fourth
 * booking costs a starter), a red in the side's previous match costs one outright.
 * FIFA-style amnesty: accumulated yellows wipe once the semifinals arrive.
 */
export function suspensionBurden(
  teamId: string,
  beforeMatch: number,
  stage: string,
  src: CampaignSources,
): number {
  let yellows = 0
  let redLastMatch = false
  const consume = (r: MatchResult, side: 'home' | 'away', isPrevious: boolean) => {
    for (const e of r.events ?? []) {
      if (e.side !== side) continue
      if (e.type === 'yellow') yellows++
      if (e.type === 'red' && isPrevious) redLastMatch = true
    }
  }
  // walk this team's completed matches in order, remembering which was most recent
  const played: { n: number; r: MatchResult; side: 'home' | 'away' }[] = []
  for (const f of groupFixturesFor(src.format)) {
    if (f.number >= beforeMatch) continue
    const home = src.groups[f.group]?.[f.homePos - 1]
    const away = src.groups[f.group]?.[f.awayPos - 1]
    if (home !== teamId && away !== teamId) continue
    const r = src.results[f.number]
    if (r && isScored(r)) played.push({ n: f.number, r, side: home === teamId ? 'home' : 'away' })
  }
  if (src.bracket) {
    const [from, to] = koRangeFor(src.format)
    for (let n = from; n < Math.min(beforeMatch, to + 1); n++) {
      const m = src.bracket[n]
      if (!m || (m.home !== teamId && m.away !== teamId) || !m.result || m.stale) continue
      played.push({ n, r: m.result, side: m.home === teamId ? 'home' : 'away' })
    }
  }
  played.sort((a, b) => a.n - b.n)
  const last = played[played.length - 1]
  for (const p of played) consume(p.r, p.side, p === last)
  // amnesty from the semifinals on: accumulated yellows are wiped, reds still bite
  const amnesty = stage === 'sf' || stage === 'third' || stage === 'final'
  const suspended = (amnesty ? 0 : Math.floor(yellows / 4)) + (redLastMatch ? 1 : 0)
  return Math.min(suspended, 3)
}

/* ————— matchday-three stakes ————— */

/**
 * Desperation on MD3, read from the live table: −1 = dead rubber (both safe),
 * 0 = normal, +1 = must-win. Derived from the side's points after two matchdays.
 */
export function stakesOf(
  teamId: string,
  group: string,
  matchday: number,
  src: CampaignSources,
): number {
  if (matchday !== 3) return 0
  let pts = 0
  let played = 0
  for (const f of groupFixturesFor(src.format)) {
    if (f.group !== group || f.matchday === 3) continue
    const home = src.groups[group]?.[f.homePos - 1]
    const away = src.groups[group]?.[f.awayPos - 1]
    if (home !== teamId && away !== teamId) continue
    const r = src.results[f.number]
    if (!r || !isScored(r)) continue
    played++
    const mine = home === teamId ? r.score.home! : r.score.away!
    const theirs = home === teamId ? r.score.away! : r.score.home!
    pts += mine > theirs ? 3 : mine === theirs ? 1 : 0
  }
  if (played < 2) return 0
  if (pts <= 1) return 1 // must win to have any chance
  if (pts >= 6) return -0.5 // safe — minds drift to the knockout
  return 0.4 // still alive, still pushing
}

/** True when both sides arrive at MD3 already safe on six points. */
export function bothSafe(homeStakes: number, awayStakes: number): boolean {
  return homeStakes < 0 && awayStakes < 0
}

/* ————— qualification log voices ————— */

export const QUAL_FLAVOR: Record<string, string> = {
  'world-order': 'The rankings speak — destiny reads its list.',
  'form-book': 'The form book is open — the last twelve months decide.',
  balanced: 'Qualification as it happens — favorites sweat, one giant falls.',
  'giant-killers': 'The trapdoors are set — giants tread carefully tonight.',
  'total-anarchy': 'All names in the hat — anything can qualify.',
}
