import { describe, expect, it } from 'vitest'
import { DEFAULT_HOSTS, NATIONS, NATION_BY_ID, rankOf } from '../../data/nations'
import { PRESET_GROUPS, PRESET_POTS } from '../../data/preset2026'
import { allocateThirds } from '../bracket'
import { groupsFromTrace, runDraw, top4Pairs, validatePots } from '../draw'
import { completeQualification } from '../qualification'
import { makeRng, stream } from '../rng'
import { GROUP_FIXTURES, GROUP_IDS, KO_BY_NUMBER, KO_MATCHES, halfOfGroup } from '../schedule'
import { seedPots } from '../seeding'
import { expectedGoals, koWinner, matchOdds, simulateMatch, GROUP_CTX } from '../simulate'
import { rankGroup } from '../standings'
import { rankThirds } from '../thirds'
import { allGroupsComplete, allStandings, bracketState, liveThirds } from '../tournament'
import type { GroupId, MatchResult, Pots, ThirdRank } from '../types'

const seedRng = (s: string) => makeRng(s)

describe('dataset', () => {
  it('has 211 nations with unique ids and the right confederation sizes', () => {
    expect(NATIONS.length).toBe(211)
    expect(new Set(NATIONS.map((n) => n.id)).size).toBe(211)
    const count = (c: string) => NATIONS.filter((n) => n.confed === c).length
    expect(count('UEFA')).toBe(55)
    expect(count('CONMEBOL')).toBe(10)
    expect(count('CONCACAF')).toBe(35)
    expect(count('CAF')).toBe(54)
    expect(count('AFC')).toBe(46)
    expect(count('OFC')).toBe(11)
  })
  it('marks exactly the three hosts', () => {
    expect(NATIONS.filter((n) => n.host).map((n) => n.id).sort()).toEqual(['CAN', 'MEX', 'USA'])
  })
})

describe('schedule', () => {
  it('numbers 72 group fixtures matchday-major with unique numbers', () => {
    expect(GROUP_FIXTURES.length).toBe(72)
    expect(new Set(GROUP_FIXTURES.map((f) => f.number)).size).toBe(72)
    const a1 = GROUP_FIXTURES.find((f) => f.number === 1)!
    expect(a1.group).toBe('A')
    expect([a1.homePos, a1.awayPos]).toEqual([1, 2])
    const md3 = GROUP_FIXTURES.filter((f) => f.matchday === 3)
    expect(Math.min(...md3.map((f) => f.number))).toBe(49)
  })
  it('R32 candidate letters sum to 40 and 3K/3L are single-slot', () => {
    const thirdMatches = KO_MATCHES.filter((m) => m.away.kind === 'third')
    expect(thirdMatches.length).toBe(8)
    const total = thirdMatches.reduce((acc, m) => acc + (m.away.kind === 'third' ? m.away.cands.length : 0), 0)
    expect(total).toBe(40)
    const slotsFor = (g: GroupId) =>
      thirdMatches.filter((m) => m.away.kind === 'third' && m.away.cands.includes(g)).map((m) => m.number)
    expect(slotsFor('K')).toEqual([80])
    expect(slotsFor('L')).toEqual([83])
    expect(slotsFor('E').length).toBe(6)
  })
  it('no third can ever meet its own group winner in the R32', () => {
    for (const m of KO_MATCHES) {
      if (m.away.kind !== 'third' || m.home.kind !== 'winner') continue
      expect(m.away.cands).not.toContain(m.home.group)
    }
  })
  it('knockout tree wires 89–104 correctly', () => {
    expect(KO_BY_NUMBER[104]!.home).toEqual({ kind: 'matchWinner', match: 101 })
    expect(KO_BY_NUMBER[103]!.away).toEqual({ kind: 'matchLoser', match: 102 })
    expect(KO_BY_NUMBER[89]!.home).toEqual({ kind: 'matchWinner', match: 74 })
    expect(KO_BY_NUMBER[96]!.away).toEqual({ kind: 'matchWinner', match: 87 })
  })
})

describe('standings — the 2026 tiebreaker cascade', () => {
  const rng = () => seedRng('lots-test')
  const rank = (id: string) => rankOf(id)

  it('head-to-head beats overall goal difference (fails under the 2022 order)', () => {
    // ESP beat GER 1-0; GER thrashed ITA 5-0 (better overall GD) but lost the H2H.
    const matches = [
      { home: 'ESP', away: 'GER', hs: 1, as: 0 },
      { home: 'GER', away: 'ITA', hs: 5, as: 0 },
      { home: 'ITA', away: 'ESP', hs: 1, as: 0 },
      { home: 'ESP', away: 'BEL', hs: 2, as: 0 },
      { home: 'GER', away: 'BEL', hs: 2, as: 0 },
      { home: 'ITA', away: 'BEL', hs: 2, as: 0 },
    ]
    // ESP, GER, ITA all on 6 pts. H2H among them is a perfect cycle (each 1W 1L)…
    // with GER's mini GD +4 (5-0, 0-1), ESP +0? ESP: beat GER 1-0, lost ITA 0-1 → mini GD 0.
    // ITA: beat ESP 1-0, lost GER 0-5 → mini GD -4. GER mini GD +4 → GER top despite the loss.
    const rows = rankGroup(['ESP', 'GER', 'ITA', 'BEL'], matches, rank, rng())
    expect(rows.map((r) => r.id)).toEqual(['GER', 'ESP', 'ITA', 'BEL'])
    expect(rows[0]!.decidedBy).toBe('h2h')
  })

  it('falls through to overall GD when H2H separates nothing (2-team tie)', () => {
    // FRA and CRO drew head-to-head, equal points; FRA better overall GD.
    const matches = [
      { home: 'FRA', away: 'CRO', hs: 1, as: 1 },
      { home: 'FRA', away: 'DEN', hs: 4, as: 0 },
      { home: 'CRO', away: 'DEN', hs: 1, as: 0 },
      { home: 'FRA', away: 'MAR', hs: 1, as: 1 },
      { home: 'CRO', away: 'MAR', hs: 1, as: 1 },
      { home: 'DEN', away: 'MAR', hs: 1, as: 0 },
    ]
    const rows = rankGroup(['FRA', 'CRO', 'DEN', 'MAR'], matches, rank, rng())
    expect(rows[0]!.id).toBe('FRA')
    expect(rows[1]!.id).toBe('CRO')
    expect(rows[0]!.decidedBy).toBe('gd')
  })

  it('sub-table recursion: H2H splits one off, the rest re-enter the cascade', () => {
    // Three tied on 4 pts: ARG beat both BRA and URU (mini pts 6, clear first).
    // BRA and URU drew each other → re-enter from H2H (level), then overall GD.
    const matches = [
      { home: 'ARG', away: 'BRA', hs: 1, as: 0 },
      { home: 'ARG', away: 'URU', hs: 1, as: 0 },
      { home: 'BRA', away: 'URU', hs: 0, as: 0 },
      { home: 'ARG', away: 'CHI', hs: 0, as: 3 },
      { home: 'BRA', away: 'CHI', hs: 3, as: 1 },
      { home: 'URU', away: 'CHI', hs: 2, as: 1 },
    ]
    // pts: ARG 6, BRA 4, URU 4, CHI 3 → BRA/URU tied: H2H level, overall GD: BRA +1? BRA: 0-1,0-0,3-1 → gf3 ga2? BRA gd = (0+0+3)-(1+0+1)=+1; URU: (0+0+2)-(1+0+1)=0
    const rows = rankGroup(['ARG', 'BRA', 'URU', 'CHI'], matches, rank, rng())
    expect(rows.map((r) => r.id)).toEqual(['ARG', 'BRA', 'URU', 'CHI'])
  })

  it('identical records fall to FIFA ranking, deterministically', () => {
    // every match 1–1: all three have identical pts/GD/GF overall AND head-to-head
    const m2 = [
      { home: 'ESP', away: 'FRA', hs: 1, as: 1 },
      { home: 'ESP', away: 'GER', hs: 1, as: 1 },
      { home: 'FRA', away: 'GER', hs: 1, as: 1 },
    ]
    const rows = rankGroup(['ESP', 'FRA', 'GER'], m2, rank, rng())
    // identical everything → FIFA ranking: ESP(1) FRA(3) GER(9)
    expect(rows.map((r) => r.id)).toEqual(['ESP', 'FRA', 'GER'])
    expect(rows[1]!.decidedBy).toBe('rank')
  })

  it('is stable and safe on partial data', () => {
    const rows = rankGroup(['ESP', 'FRA', 'GER', 'ITA'], [], rank, rng())
    expect(rows.length).toBe(4)
    expect(rows.every((r) => r.points === 0)).toBe(true)
  })
})

describe('thirds ranking', () => {
  it('ranks 12 thirds by pts/gd/gf and qualifies exactly 8', () => {
    const mkRow = (id: string, pts: number, gd: number, gf: number) => ({
      id, played: 3, won: 1, drawn: 0, lost: 2, gf, ga: gf - gd, gd, points: pts,
      position: 3 as const, decidedBy: null,
    })
    const rows = GROUP_IDS.map((g, i) => ({
      group: g,
      row: mkRow(NATIONS[i * 3]!.id, (i % 5) + 2, (i % 7) - 3, i % 6),
      complete: true,
    }))
    const ranked = rankThirds(rows, rankOf, seedRng('t'))
    expect(ranked.length).toBe(12)
    expect(ranked.filter((t) => t.qualified).length).toBe(8)
    for (let i = 1; i < ranked.length; i++) {
      const a = ranked[i - 1]!.row
      const b = ranked[i]!.row
      expect(a.points >= b.points).toBe(true)
    }
  })
})

describe('thirds allocation (Annexe C fallback)', () => {
  const mkThird = (g: GroupId, rank: number): ThirdRank => ({
    id: `T${g}`, group: g, rank, qualified: true, provisional: false,
    row: { id: `T${g}`, played: 3, won: 1, drawn: 1, lost: 1, gf: 3, ga: 3, gd: 0, points: 4, position: 3, decidedBy: null },
  })

  it('produces a valid perfect matching for the real 2026 combination', () => {
    const letters: GroupId[] = ['B', 'D', 'E', 'F', 'I', 'J', 'K', 'L']
    const thirds = letters.map((g, i) => mkThird(g, i + 1))
    const alloc = allocateThirds(thirds)
    expect(new Set(alloc.values()).size).toBe(8)
    // K can only go to 80, L only to 83 — the allocation must respect the sets
    expect(alloc.get('K')).toBe(80)
    expect(alloc.get('L')).toBe(83)
    for (const [g, m] of alloc) {
      const src = KO_BY_NUMBER[m]!.away
      expect(src.kind === 'third' && src.cands.includes(g)).toBe(true)
    }
  })

  it('finds a valid allocation for every random 8-of-12 combination (Annexe C existence)', () => {
    const rng = seedRng('annexe-c')
    for (let trial = 0; trial < 300; trial++) {
      const letters = GROUP_IDS.slice()
        .sort(() => rng() - 0.5)
        .slice(0, 8)
      const thirds = letters.map((g, i) => mkThird(g, i + 1))
      const alloc = allocateThirds(thirds)
      expect(new Set(alloc.values()).size).toBe(8)
      expect([...alloc.keys()].sort()).toEqual(letters.slice().sort())
      for (const [g, m] of alloc) {
        const src = KO_BY_NUMBER[m]!.away
        expect(src.kind === 'third' && src.cands.includes(g)).toBe(true)
      }
    }
  })
})

function assertLegalDraw(groups: Record<GroupId, (string | null)[]>, pots: Pots) {
  const potOf = new Map<string, number>()
  pots.forEach((p, i) => p.forEach((id) => potOf.set(id, i + 1)))
  for (const g of GROUP_IDS) {
    const slots = groups[g].filter((t): t is string => t !== null)
    expect(slots.length).toBe(4)
    // one team per pot
    expect(new Set(slots.map((id) => potOf.get(id))).size).toBe(4)
    // confederation caps
    const confeds = slots.map((id) => NATION_BY_ID.get(id)!.confed)
    const uefa = confeds.filter((c) => c === 'UEFA').length
    expect(uefa).toBeGreaterThanOrEqual(1)
    expect(uefa).toBeLessThanOrEqual(2)
    for (const c of ['CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as const) {
      expect(confeds.filter((x) => x === c).length).toBeLessThanOrEqual(1)
    }
  }
  // hosts anchored
  expect(groups.A[0]).toBe('MEX')
  expect(groups.B[0]).toBe('CAN')
  expect(groups.D[0]).toBe('USA')
  // top-4 separation
  const groupOf = new Map<string, GroupId>()
  for (const g of GROUP_IDS) for (const id of groups[g]) if (id) groupOf.set(id, g)
  for (const [x, y] of top4Pairs(pots.flat(), DEFAULT_HOSTS)) {
    expect(halfOfGroup(groupOf.get(x)!)).not.toBe(halfOfGroup(groupOf.get(y)!))
  }
}

describe('the draw', () => {
  it('accepts the real 2026 draw as legal (UEFA pairs from pots 1–3 included)', () => {
    const groups = {} as Record<GroupId, (string | null)[]>
    for (const g of GROUP_IDS) groups[g] = PRESET_GROUPS[g].slice()
    assertLegalDraw(groups, PRESET_POTS)
  })

  it('Monte Carlo: 200 seeded draws, zero violations, zero dead-ends', () => {
    for (let i = 0; i < 200; i++) {
      const trace = runDraw(PRESET_POTS, DEFAULT_HOSTS, seedRng(`draw-${i}`))
      expect(trace.length).toBe(48)
      assertLegalDraw(groupsFromTrace(trace), PRESET_POTS)
    }
  })

  it('produces variety across seeds', () => {
    const signatures = new Set<string>()
    for (let i = 0; i < 25; i++) {
      const trace = runDraw(PRESET_POTS, DEFAULT_HOSTS, seedRng(`variety-${i}`))
      const groups = groupsFromTrace(trace)
      signatures.add(GROUP_IDS.map((g) => groups[g].join(',')).join('|'))
    }
    expect(signatures.size).toBeGreaterThan(20)
  })

  it('supports custom hosts: a single host anchors Group A and pins Pot 1', () => {
    const hosts = ['ENG']
    const entries = PRESET_POTS.flat() // ENG is in the field; MEX/CAN/USA become regular teams
    const pots = seedPots(entries, hosts, 'official', 1, seedRng('h'))
    expect(pots[0]).toContain('ENG')
    const trace = runDraw(pots, hosts, seedRng('hostdraw'))
    const groups = groupsFromTrace(trace)
    expect(groups.A[0]).toBe('ENG')
    // no other group anchor: every group still legal
    for (const g of GROUP_IDS) {
      expect(groups[g].filter(Boolean).length).toBe(4)
    }
  })

  it('validatePots flags impossible pot configurations with a reason', () => {
    // stack 13 UEFA teams into pots 1–2 alongside… actually simplest: 2 CONMEBOL in the
    // same pot is fine, but 13+ UEFA total forces a group with 3 — build a bad set:
    const uefa = NATIONS.filter((n) => n.confed === 'UEFA').map((n) => n.id)
    const bad: Pots = [
      ['MEX', 'CAN', 'USA', ...uefa.slice(0, 9)],
      uefa.slice(9, 21),
      uefa.slice(21, 33),
      ['ARG', 'BRA', 'COL', 'URU', 'ECU', 'PAR', 'PER', 'VEN', 'CHI', 'BOL', 'JPN', 'IRN'],
    ]
    // 33 UEFA teams cannot fit 12 groups at ≤2 each with only 12 non-UEFA short — must fail
    const check = validatePots(bad, DEFAULT_HOSTS)
    expect(check.ok).toBe(false)
    expect(check.reason).toBeTruthy()
  })
})

describe('seeding strategies', () => {
  const entries = PRESET_POTS.flat()
  it('official is deterministic with hosts in pot 1', () => {
    const a = seedPots(entries, DEFAULT_HOSTS, 'official', 1, seedRng('x'))
    const b = seedPots(entries, DEFAULT_HOSTS, 'official', 1, seedRng('y'))
    expect(a).toEqual(b)
    for (const h of ['MEX', 'CAN', 'USA']) expect(a[0]).toContain(h)
    expect(a.every((p) => p.length === 12)).toBe(true)
  })
  it('stochastic strategies vary across seeds; hosts never leave pot 1', () => {
    for (const strategy of ['noisy', 'pl-draft', 'form', 'chaos'] as const) {
      const sigs = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const pots = seedPots(entries, DEFAULT_HOSTS, strategy, 1, seedRng(`${strategy}-${i}`))
        expect(pots.every((p) => p.length === 12)).toBe(true)
        for (const h of ['MEX', 'CAN', 'USA']) expect(pots[0]).toContain(h)
        sigs.add(pots.map((p) => p.slice().sort().join(',')).join('|'))
      }
      expect(sigs.size).toBeGreaterThan(15)
    }
  })
  it('same seed reproduces identical pots (determinism contract)', () => {
    const a = seedPots(entries, DEFAULT_HOSTS, 'pl-draft', 1.2, seedRng('same'))
    const b = seedPots(entries, DEFAULT_HOSTS, 'pl-draft', 1.2, seedRng('same'))
    expect(a).toEqual(b)
  })
})

describe('qualification simulator', () => {
  it('always produces exactly 48 with legal quotas and hosts locked', () => {
    for (let i = 0; i < 100; i++) {
      const { entries } = completeQualification([], DEFAULT_HOSTS, 1, seedRng(`q-${i}`))
      expect(entries.length).toBe(48)
      expect(new Set(entries).size).toBe(48)
      for (const h of ['MEX', 'CAN', 'USA']) expect(entries).toContain(h)
      const count = (c: string) => entries.filter((id) => NATION_BY_ID.get(id)!.confed === c).length
      expect(count('UEFA')).toBe(16)
      expect(count('CAF')).toBeGreaterThanOrEqual(9)
      expect(count('AFC')).toBeGreaterThanOrEqual(8)
      expect(count('CONMEBOL')).toBeGreaterThanOrEqual(6)
      expect(count('CONCACAF')).toBeGreaterThanOrEqual(6)
      expect(count('OFC')).toBeGreaterThanOrEqual(1)
      const flex = count('CAF') - 9 + (count('AFC') - 8) + (count('CONMEBOL') - 6) + (count('CONCACAF') - 6) + (count('OFC') - 1)
      expect(flex).toBeLessThanOrEqual(2)
    }
  })
  it('respects manual picks', () => {
    const manual = ['ITA', 'NGA', 'PER', 'NZL']
    const { entries } = completeQualification(manual, DEFAULT_HOSTS, 1, seedRng('manual'))
    for (const id of manual) expect(entries).toContain(id)
    expect(entries.length).toBe(48)
  })
  it('chalk mode (θ=0) qualifies strictly the top rated per confederation', () => {
    const { entries } = completeQualification([], DEFAULT_HOSTS, 0, seedRng('chalk'))
    expect(entries).toContain('ITA') // top-16 UEFA rating
    expect(entries).toContain('ESP')
  })
})

describe('match simulator', () => {
  it('knockout matches always decide a winner', () => {
    const rng = seedRng('ko')
    for (let i = 0; i < 500; i++) {
      const r = simulateMatch('ESP', 'SMR', { stage: 'r32' }, 1, rng)
      expect(koWinner('ESP', 'SMR', r)).toBeTruthy()
    }
  })
  it('scorelines are realistic between mid-strength opponents; favorites still win', () => {
    const rng = seedRng('cal')
    let goals = 0
    let favWins = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const r = simulateMatch('ESP', 'NED', GROUP_CTX, 1, rng) // ~95-point gap
      goals += r.score.home! + r.score.away!
      if (r.score.home! > r.score.away!) favWins++
    }
    expect(goals / n).toBeGreaterThan(1.8)
    expect(goals / n).toBeLessThan(3.6)
    expect(favWins / n).toBeGreaterThan(0.45)
  })

  it('draw rates between near-equals match real football (Dixon–Coles)', () => {
    const rng = seedRng('dc')
    let draws = 0
    let nilNil = 0
    let goals = 0
    const n = 3000
    for (let i = 0; i < n; i++) {
      const r = simulateMatch('CRO', 'SUI', GROUP_CTX, 1, rng) // near-equal sides
      if (r.score.home === r.score.away) draws++
      if (r.score.home === 0 && r.score.away === 0) nilNil++
      goals += r.score.home! + r.score.away!
    }
    expect(draws / n).toBeGreaterThan(0.2)
    expect(draws / n).toBeLessThan(0.34)
    expect(nilNil / n).toBeGreaterThan(0.04)
    expect(nilNil / n).toBeLessThan(0.14)
    expect(goals / n).toBeGreaterThan(2.1)
    expect(goals / n).toBeLessThan(3.3)
  })

  it('routs are rare: gross mismatches stay in single figures and 6+ margins are exceptional', () => {
    const n = 400
    let big = 0
    let maxMargin = 0
    for (let i = 0; i < n; i++) {
      const r = simulateMatch('ESP', 'NZL', GROUP_CTX, 1, seedRng(`rout:${i}`)) // ~500-point gap
      const margin = Math.abs(r.score.home! - r.score.away!)
      maxMargin = Math.max(maxMargin, margin)
      if (margin >= 6) big++
    }
    expect(big / n).toBeLessThan(0.04) // an 8-0 should be a once-a-generation event
    expect(maxMargin).toBeLessThanOrEqual(9)
  })

  it('host advantage measurably lifts win probability', () => {
    const neutral = matchOdds('MEX', 'SUI', GROUP_CTX, 1)
    const atHome = matchOdds('MEX', 'SUI', { stage: 'group', homeHost: true }, 1)
    expect(atHome.home).toBeGreaterThan(neutral.home + 0.03)
  })

  it('fatigue from a long previous knockout dents the tired side', () => {
    const fresh = matchOdds('FRA', 'GER', { stage: 'qf' }, 1)
    const tired = matchOdds('FRA', 'GER', { stage: 'qf', awayFreshness: 0.85 }, 1)
    expect(tired.home).toBeGreaterThan(fresh.home)
  })

  it('stage tension tightens matches: the final is cagier than the groups, bronze is open', () => {
    const grp = expectedGoals('ESP', 'ARG', GROUP_CTX, 1)
    const fin = expectedGoals('ESP', 'ARG', { stage: 'final' }, 1)
    const brz = expectedGoals('ESP', 'ARG', { stage: 'third' }, 1)
    expect(fin.lamHome + fin.lamAway).toBeLessThan(grp.lamHome + grp.lamAway)
    expect(brz.lamHome + brz.lamAway).toBeGreaterThan(grp.lamHome + grp.lamAway)
  })

  it('chaos knob is monotone: underdogs win more as θ rises', () => {
    // moderate gap (NED 2050 vs CRO 1990) so the dominance ceiling never saturates
    const winRate = (theta: number) => {
      const rng = seedRng(`mono-${theta}`)
      let dogWins = 0
      const n = 3000
      for (let i = 0; i < n; i++) {
        const r = simulateMatch('NED', 'CRO', { stage: 'r32' }, theta, rng)
        if (koWinner('NED', 'CRO', r) === 'CRO') dogWins++
      }
      return dogWins / n
    }
    const chalk = winRate(0)
    const real = winRate(1)
    const mayhem = winRate(2)
    expect(chalk).toBeLessThan(real)
    expect(real).toBeLessThan(mayhem)
  })
})

describe('boosters & overrides', () => {
  it('boosters shift the odds the way their effects say', async () => {
    const { setNationOverrides } = await import('../../data/nations')
    const base = matchOdds('MAR', 'SEN', GROUP_CTX, 1)
    setNationOverrides({ MAR: { boosts: ['star-striker', 'keeper-form'] } })
    const boosted = matchOdds('MAR', 'SEN', GROUP_CTX, 1)
    setNationOverrides({})
    expect(boosted.home).toBeGreaterThan(base.home + 0.05)
  })
  it('rating overrides feed the engine reads', async () => {
    const { setNationOverrides, ratingOf, rankOf } = await import('../../data/nations')
    setNationOverrides({ SMR: { rating: 2200, rank: 1 } })
    expect(ratingOf('SMR')).toBe(2200)
    expect(rankOf('SMR')).toBe(1)
    setNationOverrides({})
    expect(ratingOf('SMR')).toBe(1000)
  })
  it('a burden makes a team worse', async () => {
    const { setNationOverrides } = await import('../../data/nations')
    const base = matchOdds('GER', 'JPN', GROUP_CTX, 1)
    setNationOverrides({ GER: { boosts: ['injury-crisis', 'dressing-rift'] } })
    const cursed = matchOdds('GER', 'JPN', GROUP_CTX, 1)
    setNationOverrides({})
    expect(cursed.home).toBeLessThan(base.home - 0.05)
  })
})

describe('environment & modalities', () => {
  it('match environment is deterministic per seed and match', async () => {
    const { matchEnvironment } = await import('../environment')
    const a = matchEnvironment('SEED-X', 74)
    const b = matchEnvironment('SEED-X', 74)
    const c = matchEnvironment('SEED-Y', 74)
    expect(a).toEqual(b)
    expect(JSON.stringify(a) === JSON.stringify(c)).toBe(false)
    expect(a.refName.length).toBeGreaterThan(2)
  })
  it('heat slows matches down; altitude opens them up', () => {
    const heat = expectedGoals('BRA', 'GER', { stage: 'group', weather: 'heat' }, 1)
    const alt = expectedGoals('BRA', 'GER', { stage: 'group', weather: 'altitude' }, 1)
    const base = expectedGoals('BRA', 'GER', GROUP_CTX, 1)
    expect(heat.lamHome + heat.lamAway).toBeLessThan(base.lamHome + base.lamAway)
    expect(alt.lamHome + alt.lamAway).toBeGreaterThan(base.lamHome + base.lamAway)
  })
  it('a strict referee books more', () => {
    let strictCards = 0
    let lenientCards = 0
    const rngA = seedRng('ref-a')
    const rngB = seedRng('ref-b')
    for (let i = 0; i < 400; i++) {
      strictCards += simulateMatch('ITA', 'URU', { stage: 'group', refStrictness: 1.35 }, 1, rngA).events!.filter((e) => e.type !== 'goal').length
      lenientCards += simulateMatch('ITA', 'URU', { stage: 'group', refStrictness: 0.8 }, 1, rngB).events!.filter((e) => e.type !== 'goal').length
    }
    expect(strictCards).toBeGreaterThan(lenientCards * 1.2)
  })
})

describe('partial score entry', () => {
  it('a one-sided score never counts as played or complete', () => {
    const groups = {} as Record<GroupId, (string | null)[]>
    for (const g of GROUP_IDS) groups[g] = PRESET_GROUPS[g].slice()
    const results: Record<number, MatchResult> = { 1: { score: { home: 2, away: null } } }
    const standings = allStandings(groups, results, 'partial')
    expect(standings.A!.every((r) => r.played === 0)).toBe(true)
    expect(allGroupsComplete(results)).toBe(false)
  })
})

describe('full tournament integration', () => {
  it('runs the real 2026 draw through simulated scores to a champion', () => {
    const masterSeed = 'INTEGRATION'
    const groups = {} as Record<GroupId, (string | null)[]>
    for (const g of GROUP_IDS) groups[g] = PRESET_GROUPS[g].slice()

    const results: Record<number, MatchResult> = {}
    // simulate all 72 group matches
    for (const f of GROUP_FIXTURES) {
      const home = groups[f.group][f.homePos - 1]!
      const away = groups[f.group][f.awayPos - 1]!
      results[f.number] = simulateMatch(home, away, GROUP_CTX, 1, stream(masterSeed, `match:${f.number}`))
    }
    expect(allGroupsComplete(results)).toBe(true)

    const standings = allStandings(groups, results, masterSeed)
    for (const g of GROUP_IDS) expect(standings[g]!.length).toBe(4)
    const thirds = liveThirds(groups, standings, results, masterSeed)
    expect(thirds.length).toBe(12)
    expect(thirds.filter((t) => t.qualified).length).toBe(8)

    // play the knockout in order, entering results with participant snapshots
    for (let n = 73; n <= 104; n++) {
      const { bracket } = bracketState(groups, results, masterSeed)
      const m = bracket[n]!
      expect(m.home).toBeTruthy()
      expect(m.away).toBeTruthy()
      const r = simulateMatch(m.home!, m.away!, { stage: 'r32' }, 1, stream(masterSeed, `match:${n}`))
      r.enteredFor = [m.home!, m.away!]
      results[n] = r
    }
    const { bracket } = bracketState(groups, results, masterSeed)
    const final = bracket[104]!
    expect(final.winner).toBeTruthy()
    const third = bracket[103]!
    expect(third.winner).toBeTruthy()
    // the two semifinal losers contest the bronze
    expect([bracket[101]!.loser, bracket[102]!.loser].sort()).toEqual([third.home, third.away].sort())
    // 32 distinct teams reached the R32
    const r32Teams = new Set<string>()
    for (let n = 73; n <= 88; n++) {
      r32Teams.add(bracket[n]!.home!)
      r32Teams.add(bracket[n]!.away!)
    }
    expect(r32Teams.size).toBe(32)
  })

  it('editing a decisive group result flags downstream knockout results stale', () => {
    const masterSeed = 'STALE-TEST'
    const groups = {} as Record<GroupId, (string | null)[]>
    for (const g of GROUP_IDS) groups[g] = PRESET_GROUPS[g].slice()
    const results: Record<number, MatchResult> = {}
    for (const f of GROUP_FIXTURES) {
      const home = groups[f.group][f.homePos - 1]!
      const away = groups[f.group][f.awayPos - 1]!
      results[f.number] = simulateMatch(home, away, GROUP_CTX, 1, stream(masterSeed, `match:${f.number}`))
    }
    // enter one R32 result
    const { bracket } = bracketState(groups, results, masterSeed)
    const m73 = bracket[73]!
    const r = simulateMatch(m73.home!, m73.away!, { stage: 'r32' }, 1, stream(masterSeed, 'match:73'))
    r.enteredFor = [m73.home!, m73.away!]
    results[73] = r
    // now force a different Group A outcome: make position-4 team win huge on MD3
    const fixA = GROUP_FIXTURES.filter((f) => f.group === 'A')
    for (const f of fixA) results[f.number] = { score: { home: f.homePos === 4 ? 9 : 0, away: f.awayPos === 4 ? 9 : 0 } }
    const after = bracketState(groups, results, masterSeed)
    // runner-up of A almost surely changed; if so the result must be stale, never silently reused
    const m73after = after.bracket[73]!
    if (m73after.home !== m73.home || m73after.away !== m73.away) {
      expect(m73after.stale).toBe(true)
      expect(m73after.winner).toBeNull()
    }
  })
})
