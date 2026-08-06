import { KO_MATCHES, KO_BY_NUMBER, THIRD_SLOT_MATCHES } from './schedule'
import { koLoser, koWinner } from './simulate'
import type { GroupId, KoSource, MatchResult, StandingRow, ThirdRank } from './types'

export interface ResolvedKo {
  number: number
  home: string | null
  away: string | null
  winner: string | null
  loser: string | null
  /** a result exists but its participants changed upstream — set aside, not counted */
  stale: boolean
  result: MatchResult | null
}

export type BracketState = Record<number, ResolvedKo>

/**
 * Allocate the 8 qualified thirds to their host matches: ranked-lexicographic perfect
 * matching on the candidate sets (highest-ranked third keeps its lowest-numbered legal
 * slot, backtracking to guarantee completion). Deterministic; constraint-correct by
 * construction (a third never meets its own group's winner — the candidate sets encode it).
 */
export function allocateThirds(qualified: ThirdRank[]): Map<GroupId, number> {
  const byRank = qualified.slice().sort((a, b) => a.rank - b.rank)
  const letters = byRank.map((t) => t.group)
  const allowed = new Map<GroupId, number[]>()
  for (const g of letters) {
    const slots: number[] = []
    for (const m of THIRD_SLOT_MATCHES) {
      const src = KO_BY_NUMBER[m]!.away
      if (src.kind === 'third' && src.cands.includes(g)) slots.push(m)
    }
    allowed.set(g, slots)
  }
  const assignment = new Map<GroupId, number>()
  const used = new Set<number>()
  const solve = (i: number): boolean => {
    if (i === letters.length) return true
    const g = letters[i]!
    for (const m of allowed.get(g) ?? []) {
      if (used.has(m)) continue
      used.add(m)
      assignment.set(g, m)
      if (solve(i + 1)) return true
      used.delete(m)
      assignment.delete(g)
    }
    return false
  }
  if (!solve(0)) throw new Error('No thirds allocation exists — candidate sets violated')
  return assignment
}

/**
 * Resolve the whole knockout tree from group outcomes + entered results.
 * A knockout result only counts when its participant snapshot matches the currently
 * resolved pairing — otherwise it is flagged stale (set aside, restorable upstream).
 */
export function resolveBracket(
  standings: Record<GroupId, StandingRow[]> | null,
  thirds: ThirdRank[] | null,
  results: Record<number, MatchResult>,
): BracketState {
  const state: BracketState = {}
  const thirdSlots = thirds ? safeAllocate(thirds.filter((t) => t.qualified)) : null

  const resolveSource = (src: KoSource, matchNumber: number): string | null => {
    switch (src.kind) {
      case 'winner':
        return standings?.[src.group]?.[0]?.id ?? null
      case 'runnerUp':
        return standings?.[src.group]?.[1]?.id ?? null
      case 'third': {
        if (!thirdSlots || !thirds) return null
        for (const [g, m] of thirdSlots) {
          if (m === matchNumber) return thirds.find((t) => t.group === g && t.qualified)?.id ?? null
        }
        return null
      }
      case 'matchWinner':
        return state[src.match]?.winner ?? null
      case 'matchLoser':
        return state[src.match]?.loser ?? null
    }
  }

  for (const ko of KO_MATCHES) {
    const home = resolveSource(ko.home, ko.number)
    const away = resolveSource(ko.away, ko.number)
    const r = results[ko.number] ?? null
    let winner: string | null = null
    let loser: string | null = null
    let stale = false
    if (r && home && away) {
      const snap = r.enteredFor
      if (snap && (snap[0] !== home || snap[1] !== away)) {
        stale = true
      } else {
        winner = koWinner(home, away, r)
        loser = koLoser(home, away, r)
      }
    } else if (r && (!home || !away)) {
      stale = true
    }
    state[ko.number] = { number: ko.number, home, away, winner, loser, stale, result: r }
  }
  return state
}

function safeAllocate(qualified: ThirdRank[]): Map<GroupId, number> | null {
  if (qualified.length !== 8) return null
  try {
    return allocateThirds(qualified)
  } catch {
    return null
  }
}

/**
 * Preview which knockout results an upstream edit would invalidate — powers the
 * "This changes what comes after" confirm dialog before any destructive commit.
 */
export function staleAfter(
  standings: Record<GroupId, StandingRow[]> | null,
  thirds: ThirdRank[] | null,
  results: Record<number, MatchResult>,
): number[] {
  const next = resolveBracket(standings, thirds, results)
  return Object.values(next)
    .filter((m) => m.stale)
    .map((m) => m.number)
}
