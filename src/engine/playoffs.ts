import { rankOf } from '../data/nations'
import { koWinner } from './simulate'
import type { MatchResult } from './types'

/**
 * The FIFA Play-off Tournament, played by hand: six entrants, the two best-ranked
 * wait in the finals, the other four play semifinals. Two winners qualify.
 */
export type PlayoffMatchKey = 'sf1' | 'sf2' | 'f1' | 'f2'

export interface PlayoffState {
  /** the two bye seeds, best rank first */
  seeds: [string, string]
  sf1: [string, string]
  sf2: [string, string]
  /** finals — away side is null until its semifinal is decided */
  f1: [string, string | null]
  f2: [string, string | null]
  winners: string[]
}

export function playoffState(
  teams: readonly string[],
  results: Partial<Record<PlayoffMatchKey, MatchResult>>,
): PlayoffState | null {
  if (teams.length !== 6) return null
  const ordered = [...teams].sort((a, b) => rankOf(a) - rankOf(b))
  const [s1, s2, t3, t4, t5, t6] = ordered as [string, string, string, string, string, string]
  const sf1: [string, string] = [t3, t6]
  const sf2: [string, string] = [t4, t5]
  const decide = (k: PlayoffMatchKey, home: string, away: string | null): string | null => {
    const r = results[k]
    return r && away ? koWinner(home, away, r) : null
  }
  const wsf1 = decide('sf1', sf1[0], sf1[1])
  const wsf2 = decide('sf2', sf2[0], sf2[1])
  const f1: [string, string | null] = [s1, wsf1]
  const f2: [string, string | null] = [s2, wsf2]
  const winners = [decide('f1', f1[0], f1[1]), decide('f2', f2[0], f2[1])].filter(
    (x): x is string => x !== null,
  )
  return { seeds: [s1, s2], sf1, sf2, f1, f2, winners }
}
