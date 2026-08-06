import { isScored, type GroupFixture, type MatchResult } from './types'

export interface Contention {
  /** proven unable to finish in the top 2, even with every remaining result favorable */
  outOfTop2: boolean
  /** proven unable to finish 3rd or better — fully eliminated regardless of the thirds race */
  outOfTop3: boolean
  /** top-2 finish guaranteed regardless of remaining results (ties counted against) */
  securedTop2: boolean
}

/**
 * Points-only conservative proofs over the ≤3^k enumeration of remaining W/D/L outcomes
 * (k ≤ 6 ⇒ ≤ 729 cases). Ties on points count in the team's favor for elimination proofs
 * (goal difference could break either way) and against it for security proofs — so OUT is
 * never shown while a team is mathematically alive, and Q only when truly safe.
 */
export function groupContention(
  teamIds: readonly (string | null)[],
  fixtures: readonly GroupFixture[],
  results: Record<number, MatchResult>,
  groupSlots: readonly (string | null)[],
): Map<string, Contention> {
  const ids = teamIds.filter((t): t is string => t !== null)
  const pts = new Map<string, number>(ids.map((id) => [id, 0]))
  const remaining: { home: string; away: string }[] = []

  for (const f of fixtures) {
    const home = groupSlots[f.homePos - 1]
    const away = groupSlots[f.awayPos - 1]
    if (!home || !away) continue
    const r = results[f.number]
    if (r && isScored(r)) {
      if (r.score.home! > r.score.away!) pts.set(home, (pts.get(home) ?? 0) + 3)
      else if (r.score.home! < r.score.away!) pts.set(away, (pts.get(away) ?? 0) + 3)
      else {
        pts.set(home, (pts.get(home) ?? 0) + 1)
        pts.set(away, (pts.get(away) ?? 0) + 1)
      }
    } else {
      remaining.push({ home, away })
    }
  }

  const out = new Map<string, Contention>()
  if (remaining.length === 0 || ids.length < 4) {
    // finished (or group not fully drawn): positions are what they are
    const sorted = ids.slice().sort((a, b) => (pts.get(b) ?? 0) - (pts.get(a) ?? 0))
    for (const id of ids) {
      const optRank = 1 + sorted.filter((o) => o !== id && (pts.get(o) ?? 0) > (pts.get(id) ?? 0)).length
      out.set(id, {
        outOfTop2: remaining.length === 0 && optRank > 2,
        outOfTop3: remaining.length === 0 && optRank > 3,
        securedTop2: remaining.length === 0 && optRank <= 2,
      })
    }
    return out
  }

  const best = new Map<string, { canTop2: boolean; canTop3: boolean; alwaysTop2: boolean }>(
    ids.map((id) => [id, { canTop2: false, canTop3: false, alwaysTop2: true }]),
  )

  const k = remaining.length
  const total = Math.pow(3, k)
  for (let mask = 0; mask < total; mask++) {
    const p = new Map(pts)
    let m = mask
    for (const fix of remaining) {
      const oc = m % 3
      m = Math.floor(m / 3)
      if (oc === 0) p.set(fix.home, (p.get(fix.home) ?? 0) + 3)
      else if (oc === 1) p.set(fix.away, (p.get(fix.away) ?? 0) + 3)
      else {
        p.set(fix.home, (p.get(fix.home) ?? 0) + 1)
        p.set(fix.away, (p.get(fix.away) ?? 0) + 1)
      }
    }
    for (const id of ids) {
      const mine = p.get(id) ?? 0
      const strictlyAbove = ids.filter((o) => o !== id && (p.get(o) ?? 0) > mine).length
      const atOrAbove = ids.filter((o) => o !== id && (p.get(o) ?? 0) >= mine).length
      const b = best.get(id)!
      if (strictlyAbove < 2) b.canTop2 = true // optimistic: ties break our way
      if (strictlyAbove < 3) b.canTop3 = true
      if (atOrAbove >= 2) b.alwaysTop2 = false // pessimistic: ties break against us
    }
  }

  for (const id of ids) {
    const b = best.get(id)!
    out.set(id, { outOfTop2: !b.canTop2, outOfTop3: !b.canTop3, securedTop2: b.alwaysTop2 })
  }
  return out
}
