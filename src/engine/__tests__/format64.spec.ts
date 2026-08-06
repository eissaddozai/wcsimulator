import { describe, expect, it } from 'vitest'
import { DEFAULT_HOSTS, NATION_BY_ID, byConfed } from '../../data/nations'
import { groupsFromTrace, runDraw, validatePots } from '../draw'
import { playoff64State, seatCanExist, PLAYOFF64_SPEC } from '../playoffs'
import { completeQualification } from '../qualification'
import { makeRng, stream } from '../rng'
import {
  GROUP_FIXTURES_64,
  GROUP_IDS_64,
  KO_MATCHES_64,
  KO_BY_NUMBER_64,
  halfOfGroupFor,
} from '../schedule'
import { seedPots } from '../seeding'
import { simulateMatch } from '../simulate'
import { allGroupsComplete, bracketState } from '../tournament'
import type { Confed, GroupId, MatchResult } from '../types'

const confedOf = (id: string): Confed => NATION_BY_ID.get(id)!.confed

/** A deterministic full 64 field: qualification at θ=0 (strict top-k per confederation). */
function field64(): string[] {
  const { entries } = completeQualification([], DEFAULT_HOSTS, 0, makeRng('f64'), 64, 'balanced')
  return entries
}

describe('64-team schedule', () => {
  it('numbers 96 group fixtures matchday-major across 16 groups', () => {
    expect(GROUP_IDS_64.length).toBe(16)
    expect(GROUP_FIXTURES_64.length).toBe(96)
    expect(new Set(GROUP_FIXTURES_64.map((f) => f.number)).size).toBe(96)
    for (const g of GROUP_IDS_64) {
      expect(GROUP_FIXTURES_64.filter((f) => f.group === g).length).toBe(6)
    }
    const md3 = GROUP_FIXTURES_64.filter((f) => f.matchday === 3)
    expect(Math.min(...md3.map((f) => f.number))).toBe(65)
    expect(Math.max(...md3.map((f) => f.number))).toBe(96)
  })

  it('KO tree: 32 matches 97–128, every winner and runner-up used exactly once', () => {
    expect(KO_MATCHES_64.length).toBe(32)
    expect(KO_MATCHES_64.map((m) => m.number)).toEqual(Array.from({ length: 32 }, (_, i) => 97 + i))
    const winners: GroupId[] = []
    const runners: GroupId[] = []
    for (const m of KO_MATCHES_64.filter((m) => m.stage === 'R32')) {
      for (const src of [m.home, m.away]) {
        if (src.kind === 'winner') winners.push(src.group)
        if (src.kind === 'runnerUp') runners.push(src.group)
      }
    }
    expect(winners.slice().sort()).toEqual(GROUP_IDS_64.slice().sort())
    expect(runners.slice().sort()).toEqual(GROUP_IDS_64.slice().sort())
  })

  it('no group rematch in the R32 and halves stay separated until the final', () => {
    const groupsInSubtree = (n: number): GroupId[] => {
      const m = KO_BY_NUMBER_64[n]!
      const out: GroupId[] = []
      for (const src of [m.home, m.away]) {
        if (src.kind === 'winner' || src.kind === 'runnerUp') out.push(src.group)
        else if (src.kind === 'matchWinner' || src.kind === 'matchLoser') out.push(...groupsInSubtree(src.match))
      }
      return out
    }
    for (const m of KO_MATCHES_64.filter((m) => m.stage === 'R32')) {
      const gs = groupsInSubtree(m.number)
      expect(new Set(gs).size).toBe(gs.length) // W and R of a group never meet first up
    }
    for (const sf of [125, 126]) {
      const halves = new Set(groupsInSubtree(sf).map((g) => halfOfGroupFor(g, 64)))
      expect(halves.size).toBe(1) // each semifinal draws from a single half
    }
    expect(KO_BY_NUMBER_64[128]!.stage).toBe('FINAL')
    expect(KO_BY_NUMBER_64[127]!.stage).toBe('THIRD')
  })
})

describe('64-team qualification', () => {
  it('fills exactly 64 with the pinned quotas and four play-off tournaments', () => {
    const { entries, playoffLog } = completeQualification([], DEFAULT_HOSTS, 1, makeRng('q64'), 64, 'balanced')
    expect(entries.length).toBe(64)
    expect(new Set(entries).size).toBe(64)
    const count = (c: Confed) => entries.filter((id) => confedOf(id) === c).length
    // base quotas are minimums; the four playoff berths add on top
    expect(count('UEFA')).toBeGreaterThanOrEqual(21)
    expect(count('CAF')).toBeGreaterThanOrEqual(12)
    expect(count('AFC')).toBeGreaterThanOrEqual(10)
    expect(count('CONCACAF')).toBeGreaterThanOrEqual(8)
    expect(count('CONMEBOL')).toBeGreaterThanOrEqual(8)
    expect(count('OFC')).toBeGreaterThanOrEqual(1)
    for (const t of ['A', 'B', 'C', 'D']) {
      expect(playoffLog.some((l) => l.includes(`Play-off Tournament ${t}`))).toBe(true)
    }
  })

  it('world-order modality is deterministic chalk', () => {
    const a = completeQualification([], DEFAULT_HOSTS, 1.4, makeRng('wo1'), 48, 'world-order').entries
    const b = completeQualification([], DEFAULT_HOSTS, 1.4, makeRng('wo2'), 48, 'world-order').entries
    // direct places identical regardless of the rng (playoff results may differ on the pitch)
    expect(a.slice(0, 46).sort()).toEqual(b.slice(0, 46).sort())
  })
})

describe('64-team draw', () => {
  it('seeds 4 pots of 16 and produces a constraint-perfect draw', () => {
    const entries = field64()
    const pots = seedPots(entries, DEFAULT_HOSTS, 'official', 0, makeRng('s64'), 64)
    expect(pots.length).toBe(4)
    for (const p of pots) expect(p.length).toBe(16)
    expect(validatePots(pots, DEFAULT_HOSTS, 64).ok).toBe(true)

    const trace = runDraw(pots, DEFAULT_HOSTS, stream('d64', 'draw'), 64)
    expect(trace.length).toBe(64)
    const groups = groupsFromTrace(trace, 64)
    const uefaTotal = entries.filter((id) => confedOf(id) === 'UEFA').length
    for (const g of GROUP_IDS_64) {
      const ids = groups[g].filter((x): x is string => x !== null)
      expect(ids.length).toBe(4)
      const perConfed = new Map<Confed, number>()
      for (const id of ids) perConfed.set(confedOf(id), (perConfed.get(confedOf(id)) ?? 0) + 1)
      for (const [c, n] of perConfed) {
        expect(n).toBeLessThanOrEqual(c === 'UEFA' ? 2 : 1)
      }
      if (uefaTotal >= 16) expect(perConfed.get('UEFA') ?? 0).toBeGreaterThanOrEqual(1)
    }
    // hosts anchored
    expect(groups.A[0]).toBe(DEFAULT_HOSTS[0])
    expect(groups.B[0]).toBe(DEFAULT_HOSTS[1])
    expect(groups.D[0]).toBe(DEFAULT_HOSTS[2])
  })
})

describe('64-team intercontinental play-offs', () => {
  /** 16 entrants at the pinned allocation: the best-ranked sides beyond each direct quota. */
  function entrants16(): string[] {
    const take = (c: Confed, skip: number, n: number) =>
      byConfed(c)
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .slice(skip, skip + n)
        .map((x) => x.id)
    return [
      ...take('UEFA', 21, 4),
      ...take('CAF', 12, 3),
      ...take('AFC', 10, 3),
      ...take('CONCACAF', 8, 3),
      ...take('CONMEBOL', 8, 2),
      ...take('OFC', 1, 1),
    ]
  }

  it('spec bracket has no confederation facing itself inside a tournament', () => {
    for (const t of PLAYOFF64_SPEC) {
      const confeds = [...t.sf1, ...t.sf2].map(([c]) => c)
      expect(new Set(confeds).size).toBe(4)
    }
    expect(PLAYOFF64_SPEC.map((t) => t.berth)).toEqual([61, 62, 63, 64])
    // UEFA's four seats spread one per tournament
    const uefaHomes = PLAYOFF64_SPEC.map((t) => [...t.sf1, ...t.sf2].filter(([c]) => c === 'UEFA').length)
    expect(uefaHomes).toEqual([1, 1, 1, 1])
  })

  it('knows which seats can exist under the direct quotas', () => {
    expect(seatCanExist('UEFA', 4)).toBe(true) // 55 members, 21 direct
    expect(seatCanExist('CONMEBOL', 2)).toBe(true) // 10 members, 8 direct
    expect(seatCanExist('CONMEBOL', 3)).toBe(false) // ...only 2 can ever remain
    expect(seatCanExist('OFC', 1)).toBe(true)
  })

  it('resolves four winners from played results with every seat filled', () => {
    const teams = entrants16()
    const empty = playoff64State(teams, {})
    expect(empty).not.toBeNull()
    for (const t of empty!.tournaments) {
      expect(t.sf1.every((x) => x !== null)).toBe(true)
      expect(t.sf2.every((x) => x !== null)).toBe(true)
      expect(t.sf1Vacant).toBeUndefined()
      expect(t.sf2Vacant).toBeUndefined()
      expect(t.winner).toBeNull()
    }
    // play everything with the minute engine
    const results: Record<string, MatchResult> = {}
    const rng = makeRng('po64')
    for (const t of empty!.tournaments) {
      const lo = t.id.toLowerCase()
      for (const [key, pair] of [
        [`${lo}-sf1`, t.sf1],
        [`${lo}-sf2`, t.sf2],
      ] as const) {
        results[key] = simulateMatch(pair[0]!, pair[1]!, { stage: 'r32' }, 1, rng)
      }
      const mid = playoff64State(teams, results)!
      const ft = mid.tournaments.find((x) => x.id === t.id)!
      expect(ft.f[0]).not.toBeNull()
      expect(ft.f[1]).not.toBeNull()
      results[`${lo}-f`] = simulateMatch(ft.f[0]!, ft.f[1]!, { stage: 'r32' }, 1, rng)
    }
    const done = playoff64State(teams, results)!
    expect(done.winners.length).toBe(4)
    // one winner per tournament, and every winner is one of that tournament's four entrants
    for (const t of done.tournaments) {
      expect([...t.sf1, ...t.sf2]).toContain(t.winner)
    }
  })
})

describe('64-team full tournament', () => {
  it('runs group stage and knockout end to end and crowns a champion', () => {
    const entries = field64()
    const pots = seedPots(entries, DEFAULT_HOSTS, 'official', 0, makeRng('t64'), 64)
    const trace = runDraw(pots, DEFAULT_HOSTS, stream('t64', 'draw'), 64)
    const groups = groupsFromTrace(trace, 64)
    const results: Record<number, MatchResult> = {}
    for (const f of GROUP_FIXTURES_64) {
      const home = groups[f.group][f.homePos - 1]!
      const away = groups[f.group][f.awayPos - 1]!
      results[f.number] = simulateMatch(home, away, { stage: 'group' }, 1, stream('t64', `m:${f.number}`))
    }
    expect(allGroupsComplete(results, 64)).toBe(true)
    for (let n = 97; n <= 128; n++) {
      const { bracket } = bracketState(groups, results, 't64', 64)
      const m = bracket[n]!
      expect(m.home).not.toBeNull()
      expect(m.away).not.toBeNull()
      const r = simulateMatch(m.home!, m.away!, { stage: 'r32' }, 1, stream('t64', `m:${n}`))
      r.enteredFor = [m.home!, m.away!]
      results[n] = r
    }
    const { bracket } = bracketState(groups, results, 't64', 64)
    expect(bracket[128]!.winner).not.toBeNull()
    expect(bracket[127]!.winner).not.toBeNull()
    // the two semifinal losers contest bronze
    const sfLosers = [bracket[125]!.loser, bracket[126]!.loser]
    expect(sfLosers).toContain(bracket[127]!.home)
    expect(sfLosers).toContain(bracket[127]!.away)
  })
})
