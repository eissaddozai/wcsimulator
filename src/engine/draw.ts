import { NATION_BY_ID, rankOf } from '../data/nations'
import type { Rng } from './rng'
import { shuffle } from './rng'
import { POT_TO_POSITION, groupIdsFor, halfOfGroupFor } from './schedule'
import type { Confed, DrawPick, Format, GroupId, Pots, PotNumber } from './types'

/** Host group anchors in host-selection order: first host opens Group A, then B, then D. */
export function hostAnchors(hosts: readonly string[]): Record<string, GroupId> {
  const slots: GroupId[] = ['A', 'B', 'D']
  const out: Record<string, GroupId> = {}
  hosts.slice(0, 3).forEach((h, i) => {
    out[h] = slots[i]!
  })
  return out
}

function confedOf(id: string): Confed {
  return NATION_BY_ID.get(id)!.confed
}

/**
 * Top 4 of the field by FIFA ranking, paired (1,2) and (3,4) for bracket-half separation.
 * A pair whose members are both hosts locked into the same half drops its constraint
 * instead of making the draw unsatisfiable.
 */
export function top4Pairs(entries: readonly string[], hosts: readonly string[], format: Format = 48): [string, string][] {
  const anchors = hostAnchors(hosts)
  const sorted = entries.slice().sort((a, b) => rankOf(a) - rankOf(b))
  const t = sorted.slice(0, 4)
  if (t.length < 4) return []
  const pairs: [string, string][] = [
    [t[0]!, t[1]!],
    [t[2]!, t[3]!],
  ]
  return pairs.filter(([x, y]) => {
    const gx = anchors[x]
    const gy = anchors[y]
    return !(gx && gy && halfOfGroupFor(gx, format) === halfOfGroupFor(gy, format))
  })
}

interface Ball {
  id: string
  pot: PotNumber
}

/**
 * The draw as a single backtracking search over the drawn ball order. Each ball goes to
 * the first group in A→L order that passes the constraints AND from which the rest of
 * the draw can complete — semantically identical to FIFA's feasibility-lookahead rule
 * (the accepted group is the lexicographically-first completable choice), but computed
 * in one DFS pass so a full draw resolves in about a millisecond.
 *
 * Constraints: C1 max 1 per confederation per group (C2: UEFA min 1 / max 2);
 * C3 hosts anchored MEX→A1, CAN→B1, USA→D1; C4 top-4-by-ranking bracket-half separation.
 */
class DrawSolver {
  private slots: Record<GroupId, (string | null)[]> = {} as never
  private confedCount: Record<GroupId, Partial<Record<Confed, number>>> = {} as never
  private pairs: [string, string][]
  private uefaTotal: number
  private groupOf = new Map<string, GroupId>()
  private nodes = 0
  private readonly nodeBudget: number
  private readonly groupIds: GroupId[]

  private anchors: Record<string, GroupId>

  constructor(
    private pots: Pots,
    hosts: readonly string[],
    private readonly format: Format = 48,
    nodeBudget = 2_000_000,
  ) {
    this.nodeBudget = nodeBudget
    this.groupIds = groupIdsFor(format)
    this.anchors = hostAnchors(hosts)
    for (const g of this.groupIds) {
      this.slots[g] = [null, null, null, null, null] // indexed by pot 1..4
      this.confedCount[g] = {}
    }
    this.pairs = top4Pairs(pots.flat(), hosts, format)
    this.uefaTotal = pots.flat().filter((id) => confedOf(id) === 'UEFA').length
  }

  private violation(id: string, pot: PotNumber, g: GroupId): string | null {
    if (this.slots[g][pot] !== null) return `Group ${g} already has a Pot ${pot} team`
    const c = confedOf(id)
    const count = this.confedCount[g][c] ?? 0
    if (c === 'UEFA') {
      if (count >= 2) return `Group ${g} already has two UEFA teams`
    } else if (count >= 1) {
      return `Group ${g} already has a ${c} team`
    }
    for (const [x, y] of this.pairs) {
      const partner = id === x ? y : id === y ? x : null
      if (!partner) continue
      const pg = this.groupOf.get(partner)
      if (pg && halfOfGroupFor(pg, this.format) === halfOfGroupFor(g, this.format)) {
        return `Group ${g} is in the same bracket half as ${NATION_BY_ID.get(partner)!.name}`
      }
    }
    return null
  }

  private place(id: string, pot: PotNumber, g: GroupId) {
    this.slots[g][pot] = id
    const c = confedOf(id)
    this.confedCount[g][c] = (this.confedCount[g][c] ?? 0) + 1
    this.groupOf.set(id, g)
  }

  private unplace(id: string, pot: PotNumber, g: GroupId) {
    this.slots[g][pot] = null
    const c = confedOf(id)
    this.confedCount[g][c] = (this.confedCount[g][c] ?? 1) - 1
    this.groupOf.delete(id)
  }

  /** Counting prunes: per-confed residual capacity + UEFA ≥1-per-group coverage. */
  private prune(balls: Ball[], from: number): boolean {
    const remainingByConfed = new Map<Confed, number>()
    for (let i = from; i < balls.length; i++) {
      const c = confedOf(balls[i]!.id)
      remainingByConfed.set(c, (remainingByConfed.get(c) ?? 0) + 1)
    }
    for (const [c, n] of remainingByConfed) {
      const cap = c === 'UEFA' ? 2 : 1
      let capacity = 0
      for (const g of this.groupIds) {
        const open = this.slots[g].reduce((acc, s, i) => acc + (i >= 1 && s === null ? 1 : 0), 0)
        capacity += Math.min(Math.max(cap - (this.confedCount[g][c] ?? 0), 0), open)
      }
      if (n > capacity) return false
    }
    if (this.uefaTotal >= this.groupIds.length) {
      const uefaRemaining = remainingByConfed.get('UEFA') ?? 0
      const uncovered = this.groupIds.filter((g) => (this.confedCount[g].UEFA ?? 0) === 0)
      if (uncovered.length > uefaRemaining) return false
      // stronger: every uncovered group needs a DISTINCT remaining UEFA ball whose pot
      // slot is still open there — a bipartite matching, checked with simple augmenting
      // paths (≤12×16). Catches doomed branches whole pots earlier than the count bound.
      if (uncovered.length > 0) {
        const uefaBalls: Ball[] = []
        for (let i = from; i < balls.length; i++) {
          if (confedOf(balls[i]!.id) === 'UEFA') uefaBalls.push(balls[i]!)
        }
        const matchOfBall = new Map<number, number>() // ball index → group index
        const tryMatch = (gi: number, seen: Set<number>): boolean => {
          for (let bi = 0; bi < uefaBalls.length; bi++) {
            if (seen.has(bi)) continue
            const b = uefaBalls[bi]!
            if (this.slots[uncovered[gi]!]![b.pot] !== null) continue
            seen.add(bi)
            const cur = matchOfBall.get(bi)
            if (cur === undefined || tryMatch(cur, seen)) {
              matchOfBall.set(bi, gi)
              return true
            }
          }
          return false
        }
        for (let gi = 0; gi < uncovered.length; gi++) {
          if (!tryMatch(gi, new Set())) return false
        }
      }
    }
    return true
  }

  /**
   * Assign balls[from..] in order; record the chosen group per index. Returns true when
   * the whole draw completes. `skipped[i]` accumulates the groups ball i was refused
   * (with reasons) on the accepted path.
   */
  private solve(balls: Ball[], from: number, chosen: GroupId[], skipped: { group: GroupId; reason: string }[][]): boolean {
    if (from === balls.length) return true
    if (++this.nodes > this.nodeBudget) throw new Error('Draw solver exceeded its node budget')
    if (!this.prune(balls, from)) return false
    const ball = balls[from]!
    const mySkipped: { group: GroupId; reason: string }[] = []
    for (const g of this.groupIds) {
      if (this.slots[g][ball.pot] !== null) continue
      const v = this.violation(ball.id, ball.pot, g)
      if (v) {
        mySkipped.push({ group: g, reason: v })
        continue
      }
      this.place(ball.id, ball.pot, g)
      if (this.solve(balls, from + 1, chosen, skipped)) {
        chosen[from] = g
        skipped[from] = mySkipped
        return true
      }
      this.unplace(ball.id, ball.pot, g)
      mySkipped.push({ group: g, reason: `Group ${g} would leave the draw uncompletable` })
    }
    return false
  }

  run(rng: Rng): DrawPick[] {
    const picks: DrawPick[] = []
    // pre-place hosts at their anchors
    for (const [id, g] of Object.entries(this.anchors) as [string, GroupId][]) {
      if (!this.pots[0]!.includes(id)) continue
      this.place(id, 1, g)
      picks.push({ order: picks.length, teamId: id, pot: 1, group: g, position: 1, forced: true, skipped: [] })
    }
    // draw order: pot 1 → 4, shuffled within each pot
    const balls: Ball[] = []
    this.pots.forEach((p, i) => {
      const nonHosts = p.filter((id) => !this.groupOf.has(id))
      for (const id of shuffle(nonHosts, rng)) balls.push({ id, pot: (i + 1) as PotNumber })
    })
    const chosen: GroupId[] = []
    const skipped: { group: GroupId; reason: string }[][] = []
    if (!this.solve(balls, 0, chosen, skipped)) {
      throw new Error('No legal draw exists for these pots')
    }
    balls.forEach((ball, i) => {
      const g = chosen[i]!
      picks.push({
        order: picks.length,
        teamId: ball.id,
        pot: ball.pot,
        group: g,
        position: POT_TO_POSITION[ball.pot],
        forced: (skipped[i] ?? []).length > 0,
        skipped: skipped[i] ?? [],
      })
    })
    return picks
  }

  feasibleAtAll(): boolean {
    for (const [id, g] of Object.entries(this.anchors) as [string, GroupId][]) {
      if (this.pots[0]!.includes(id)) this.place(id, 1, g)
    }
    const remaining: Ball[] = []
    this.pots.forEach((p, i) => {
      for (const id of p) {
        if (this.groupOf.has(id)) continue
        remaining.push({ id, pot: (i + 1) as PotNumber })
      }
    })
    try {
      return this.solve(remaining, 0, [], [])
    } catch {
      return false // node budget blown — treat as not verifiably drawable
    }
  }
}

export function runDraw(pots: Pots, hosts: readonly string[], rng: Rng, format: Format = 48): DrawPick[] {
  return new DrawSolver(pots, hosts, format).run(rng)
}

/** Pre-check for the seeding-room linter: can this pot configuration produce a legal draw? */
export function validatePots(pots: Pots, hosts: readonly string[], format: Format = 48): { ok: boolean; reason: string | null } {
  const potSize = format / 4
  if (pots.length !== 4 || pots.some((p) => p.length !== potSize)) {
    return { ok: false, reason: `Each pot must hold exactly ${potSize} teams` }
  }
  for (const h of hosts) {
    if (pots.flat().includes(h) && !pots[0]!.includes(h)) {
      return { ok: false, reason: `${NATION_BY_ID.get(h)!.name} is a host and must be in Pot 1` }
    }
  }
  if (!new DrawSolver(pots, hosts, format, 300_000).feasibleAtAll()) {
    const counts = new Map<Confed, number>()
    for (const id of pots.flat()) counts.set(confedOf(id), (counts.get(confedOf(id)) ?? 0) + 1)
    const worst = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    return {
      ok: false,
      reason: `No legal draw exists for these pots — likely too many ${worst?.[0] ?? ''} teams concentrated together`,
    }
  }
  return { ok: true, reason: null }
}

/** Reconstruct groups (position-ordered) from a draw trace. */
export function groupsFromTrace(trace: readonly DrawPick[], format: Format = 48): Record<GroupId, (string | null)[]> {
  const groups = {} as Record<GroupId, (string | null)[]>
  for (const g of groupIdsFor(format)) groups[g] = [null, null, null, null]
  for (const p of trace) groups[p.group][p.position - 1] = p.teamId
  return groups
}
