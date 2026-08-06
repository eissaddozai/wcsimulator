import type { Rng } from './rng'
import { shuffle } from './rng'
import type { StandingRow, TieBreakRung } from './types'

export interface PlayedMatch {
  home: string
  away: string
  hs: number
  as: number
}

interface Stats {
  id: string
  p: number
  w: number
  d: number
  l: number
  gf: number
  ga: number
  gd: number
  pts: number
}

function aggregate(ids: readonly string[], matches: readonly PlayedMatch[]): Map<string, Stats> {
  const map = new Map<string, Stats>()
  for (const id of ids) map.set(id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 })
  for (const m of matches) {
    const h = map.get(m.home)
    const a = map.get(m.away)
    if (!h || !a) continue
    h.p++
    a.p++
    h.gf += m.hs
    h.ga += m.as
    a.gf += m.as
    a.ga += m.hs
    if (m.hs > m.as) {
      h.w++
      a.l++
      h.pts += 3
    } else if (m.hs < m.as) {
      a.w++
      h.l++
      a.pts += 3
    } else {
      h.d++
      a.d++
      h.pts++
      a.pts++
    }
  }
  for (const s of map.values()) s.gd = s.gf - s.ga
  return map
}

/**
 * The 2026 tiebreaker cascade (head-to-head FIRST — a deliberate change from 2022):
 * points → H2H points/GD/GF among the tied teams (with sub-table recursion on still-tied
 * strict subsets) → overall group GD → overall group GF → FIFA ranking → seeded lots.
 * Conduct score sits between GF and ranking in the official text; it degenerates to a
 * no-op here because card entry is not modeled.
 */
export function rankGroup(
  ids: readonly string[],
  matches: readonly PlayedMatch[],
  rankOf: (id: string) => number,
  lotsRng: Rng,
): StandingRow[] {
  const overall = aggregate(ids, matches)
  const decided = new Map<string, TieBreakRung>()

  const orderByOverallThenRank = (tied: string[]): string[] => {
    const pre = shuffle(tied, lotsRng) // pre-shuffled so genuine lots are deterministic-per-seed
    return pre.sort((x, y) => {
      const a = overall.get(x)!
      const b = overall.get(y)!
      if (a.gd !== b.gd) {
        tag([x, y], 'gd')
        return b.gd - a.gd
      }
      if (a.gf !== b.gf) {
        tag([x, y], 'gf')
        return b.gf - a.gf
      }
      if (rankOf(x) !== rankOf(y)) {
        tag([x, y], 'rank')
        return rankOf(x) - rankOf(y)
      }
      tag([x, y], 'lots')
      return 0 // pre-shuffle order stands = drawing of lots
    })
  }

  const tag = (pair: string[], rung: TieBreakRung) => {
    for (const id of pair) {
      const cur = decided.get(id)
      // keep the strongest (latest-reached) rung per team for UI honesty
      const order: TieBreakRung[] = ['points', 'h2h', 'gd', 'gf', 'rank', 'lots']
      if (!cur || order.indexOf(rung) > order.indexOf(cur)) decided.set(id, rung)
    }
  }

  /** Break a points-tied class per the cascade. Terminates: recursion strictly shrinks. */
  const breakTie = (tied: string[]): string[] => {
    if (tied.length === 1) return tied
    const sub = matches.filter((m) => tied.includes(m.home) && tied.includes(m.away))
    const mini = aggregate(tied, sub)
    // order by H2H points, H2H GD, H2H GF
    const sorted = tied
      .slice()
      .sort((x, y) => {
        const a = mini.get(x)!
        const b = mini.get(y)!
        return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
      })
    // partition into H2H-equivalence classes
    const classes: string[][] = []
    for (const id of sorted) {
      const last = classes[classes.length - 1]
      if (last) {
        const a = mini.get(last[0]!)!
        const b = mini.get(id)!
        if (a.pts === b.pts && a.gd === b.gd && a.gf === b.gf) {
          last.push(id)
          continue
        }
      }
      classes.push([id])
    }
    if (classes.length === 1) {
      // H2H separated nothing → overall GD / GF / rank / lots among the whole class
      return orderByOverallThenRank(tied)
    }
    // H2H separated at least some — recurse on still-tied strict subsets (sub-table recursion)
    const out: string[] = []
    for (const cls of classes) {
      if (cls.length === 1) {
        tag(cls, 'h2h')
        out.push(cls[0]!)
      } else {
        for (const id of cls) tag([id], 'h2h')
        out.push(...breakTie(cls))
      }
    }
    return out
  }

  // form tie classes on points ONLY
  const byPts = [...overall.values()].sort((a, b) => b.pts - a.pts)
  const ordered: string[] = []
  let i = 0
  while (i < byPts.length) {
    let j = i
    while (j < byPts.length && byPts[j]!.pts === byPts[i]!.pts) j++
    const cls = byPts.slice(i, j).map((s) => s.id)
    if (cls.length === 1) ordered.push(cls[0]!)
    else ordered.push(...breakTie(cls))
    i = j
  }

  return ordered.map((id, idx) => {
    const s = overall.get(id)!
    return {
      id,
      played: s.p,
      won: s.w,
      drawn: s.d,
      lost: s.l,
      gf: s.gf,
      ga: s.ga,
      gd: s.gd,
      points: s.pts,
      position: (idx + 1) as StandingRow['position'],
      decidedBy: decided.get(id) ?? null,
    }
  })
}
