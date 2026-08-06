import { rankOf } from '../data/nations'
import { resolveBracket, type BracketState } from './bracket'
import { groupContention, type Contention } from './contention'
import { stream } from './rng'
import { fixturesOfGroupFor, groupIdsFor } from './schedule'
import { rankGroup, type PlayedMatch } from './standings'
import { rankThirds } from './thirds'
import { isScored, type Format, type GroupId, type MatchResult, type StandingRow, type ThirdRank } from './types'

export type Groups = Record<GroupId, (string | null)[]>

export function playedMatches(
  group: GroupId,
  slots: readonly (string | null)[],
  results: Record<number, MatchResult>,
  format: Format = 48,
): PlayedMatch[] {
  const out: PlayedMatch[] = []
  for (const f of fixturesOfGroupFor(group, format)) {
    const home = slots[f.homePos - 1]
    const away = slots[f.awayPos - 1]
    const r = results[f.number]
    if (home && away && r && isScored(r)) out.push({ home, away, hs: r.score.home!, as: r.score.away! })
  }
  return out
}

export function groupComplete(group: GroupId, results: Record<number, MatchResult>, format: Format = 48): boolean {
  return fixturesOfGroupFor(group, format).every((f) => {
    const r = results[f.number]
    return r !== undefined && isScored(r)
  })
}

export function allGroupsComplete(results: Record<number, MatchResult>, format: Format = 48): boolean {
  return groupIdsFor(format).every((g) => groupComplete(g, results, format))
}

export function allStandings(
  groups: Groups,
  results: Record<number, MatchResult>,
  masterSeed: string,
  format: Format = 48,
): Record<GroupId, StandingRow[]> {
  const out = {} as Record<GroupId, StandingRow[]>
  for (const g of groupIdsFor(format)) {
    const slots = groups[g]
    const ids = slots.filter((t): t is string => t !== null)
    out[g] = rankGroup(ids, playedMatches(g, slots, results, format), rankOf, stream(masterSeed, `lots:${g}`))
  }
  return out
}

/** 48-team format only — the 64-team knockout takes straight top-twos, no best-thirds race. */
export function liveThirds(
  groups: Groups,
  standings: Record<GroupId, StandingRow[]>,
  results: Record<number, MatchResult>,
  masterSeed: string,
): ThirdRank[] {
  const rows: { group: GroupId; row: StandingRow; complete: boolean }[] = []
  for (const g of groupIdsFor(48)) {
    const third = standings[g]?.[2]
    if (third) rows.push({ group: g, row: third, complete: groupComplete(g, results) })
  }
  if (rows.length < 12) return []
  return rankThirds(rows, rankOf, stream(masterSeed, 'lots:thirds'))
}

export function bracketState(
  groups: Groups,
  results: Record<number, MatchResult>,
  masterSeed: string,
  format: Format = 48,
): { bracket: BracketState; standings: Record<GroupId, StandingRow[]>; thirds: ThirdRank[] } {
  const standings = allStandings(groups, results, masterSeed, format)
  const complete = allGroupsComplete(results, format)
  const thirds = complete && format === 48 ? liveThirds(groups, standings, results, masterSeed) : []
  const bracket = resolveBracket(complete ? standings : null, complete && format === 48 ? thirds : null, results, format)
  return { bracket, standings, thirds }
}

export function contentionFor(
  groups: Groups,
  results: Record<number, MatchResult>,
  format: Format = 48,
): Record<GroupId, Map<string, Contention>> {
  const out = {} as Record<GroupId, Map<string, Contention>>
  for (const g of groupIdsFor(format)) {
    out[g] = groupContention(groups[g], fixturesOfGroupFor(g, format), results, groups[g])
  }
  return out
}
