import { NATION_BY_ID, rankOf } from '../data/nations'
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

/* ————————————————— the 64-team Intercontinental Play-offs ————————————————— */

export type Playoff64Key =
  | 'a-sf1' | 'a-sf2' | 'a-f'
  | 'b-sf1' | 'b-sf2' | 'b-f'
  | 'c-sf1' | 'c-sf2' | 'c-f'
  | 'd-sf1' | 'd-sf2' | 'd-f'

export interface Playoff64Tournament {
  id: 'A' | 'B' | 'C' | 'D'
  berth: number
  sf1: [string | null, string | null]
  sf2: [string | null, string | null]
  f: [string | null, string | null]
  winner: string | null
}

export interface Playoff64State {
  tournaments: Playoff64Tournament[]
  winners: string[]
  /** confed designations: e.g. designation['UEFA'][0] is UEFA Team 1 */
  designation: Record<string, string[]>
}

/**
 * Pinned bracket allocation (FORMAT-64). CONMEBOL 3 was requested but cannot exist —
 * 8 of CONMEBOL's 10 members qualify directly, leaving at most 2 entrants — so that
 * seat reverts to OFC 2 (feasibility amendment). No tournament repeats a confederation.
 */
export const PLAYOFF64_SPEC: { id: 'A' | 'B' | 'C' | 'D'; berth: number; sf1: [string, number][]; sf2: [string, number][] }[] = [
  { id: 'A', berth: 61, sf1: [['UEFA', 1], ['OFC', 2]], sf2: [['CAF', 3], ['AFC', 2]] },
  { id: 'B', berth: 62, sf1: [['CAF', 1], ['CONCACAF', 3]], sf2: [['AFC', 3], ['OFC', 1]] },
  { id: 'C', berth: 63, sf1: [['AFC', 1], ['UEFA', 3]], sf2: [['CONCACAF', 2], ['CONMEBOL', 2]] },
  { id: 'D', berth: 64, sf1: [['CONCACAF', 1], ['CAF', 2]], sf2: [['CONMEBOL', 1], ['UEFA', 2]] },
]

export function playoff64State(
  teams: readonly string[],
  results: Partial<Record<string, MatchResult>>,
): Playoff64State | null {
  if (teams.length !== 16) return null
  // designate Team 1..N per confederation by world ranking
  const designation: Record<string, string[]> = {}
  for (const id of [...teams].sort((a, b) => rankOf(a) - rankOf(b))) {
    const confed = NATION_BY_ID.get(id)?.confed ?? '??'
    ;(designation[confed] ??= []).push(id)
  }
  const pick = (confed: string, n: number): string | null => designation[confed]?.[n - 1] ?? null

  const decide = (key: string, home: string | null, away: string | null): string | null => {
    const r = results[key]
    return r && home && away ? koWinner(home, away, r) : null
  }

  const tournaments: Playoff64Tournament[] = PLAYOFF64_SPEC.map((t) => {
    const lo = t.id.toLowerCase()
    const sf1: [string | null, string | null] = [pick(t.sf1[0]![0], t.sf1[0]![1]), pick(t.sf1[1]![0], t.sf1[1]![1])]
    const sf2: [string | null, string | null] = [pick(t.sf2[0]![0], t.sf2[0]![1]), pick(t.sf2[1]![0], t.sf2[1]![1])]
    const w1 = decide(`${lo}-sf1`, sf1[0], sf1[1])
    const w2 = decide(`${lo}-sf2`, sf2[0], sf2[1])
    const f: [string | null, string | null] = [w1, w2]
    const winner = decide(`${lo}-f`, f[0], f[1])
    return { id: t.id, berth: t.berth, sf1, sf2, f, winner }
  })
  return {
    tournaments,
    winners: tournaments.map((t) => t.winner).filter((x): x is string => x !== null),
    designation,
  }
}
