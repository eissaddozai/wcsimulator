import { rankOf } from '../data/nations'
import { resolveBracket, type BracketState } from './bracket'
import { groupContention, type Contention } from './contention'
import { stream } from './rng'
import { GROUP_IDS, fixturesOfGroup } from './schedule'
import { rankGroup, type PlayedMatch } from './standings'
import { rankThirds } from './thirds'
import type { GroupId, MatchResult, StandingRow, ThirdRank } from './types'

export type Groups = Record<GroupId, (string | null)[]>

export function playedMatches(group: GroupId, slots: readonly (string | null)[], results: Record<number, MatchResult>): PlayedMatch[] {
  const out: PlayedMatch[] = []
  for (const f of fixturesOfGroup(group)) {
    const home = slots[f.homePos - 1]
    const away = slots[f.awayPos - 1]
    const r = results[f.number]
    if (home && away && r) out.push({ home, away, hs: r.score.home, as: r.score.away })
  }
  return out
}

export function groupComplete(group: GroupId, results: Record<number, MatchResult>): boolean {
  return fixturesOfGroup(group).every((f) => results[f.number] !== undefined)
}

export function allGroupsComplete(results: Record<number, MatchResult>): boolean {
  return GROUP_IDS.every((g) => groupComplete(g, results))
}

export function allStandings(groups: Groups, results: Record<number, MatchResult>, masterSeed: string): Record<GroupId, StandingRow[]> {
  const out = {} as Record<GroupId, StandingRow[]>
  for (const g of GROUP_IDS) {
    const slots = groups[g]
    const ids = slots.filter((t): t is string => t !== null)
    out[g] = rankGroup(ids, playedMatches(g, slots, results), rankOf, stream(masterSeed, `lots:${g}`))
  }
  return out
}

export function liveThirds(
  groups: Groups,
  standings: Record<GroupId, StandingRow[]>,
  results: Record<number, MatchResult>,
  masterSeed: string,
): ThirdRank[] {
  const rows: { group: GroupId; row: StandingRow; complete: boolean }[] = []
  for (const g of GROUP_IDS) {
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
): { bracket: BracketState; standings: Record<GroupId, StandingRow[]>; thirds: ThirdRank[] } {
  const standings = allStandings(groups, results, masterSeed)
  const complete = allGroupsComplete(results)
  const thirds = complete ? liveThirds(groups, standings, results, masterSeed) : []
  const bracket = resolveBracket(complete ? standings : null, complete ? thirds : null, results)
  return { bracket, standings, thirds }
}

export function contentionFor(groups: Groups, results: Record<number, MatchResult>): Record<GroupId, Map<string, Contention>> {
  const out = {} as Record<GroupId, Map<string, Contention>>
  for (const g of GROUP_IDS) {
    out[g] = groupContention(groups[g], fixturesOfGroup(g), results, groups[g])
  }
  return out
}
