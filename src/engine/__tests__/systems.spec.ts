import { describe, expect, it } from 'vitest'
import { isRivalry, starOf, stakesOf, suspensionBurden, formDriftOf, type CampaignSources } from '../campaign'
import { makeRng } from '../rng'
import { matchOdds, simulateMatch } from '../simulate'
import type { MatchResult } from '../types'

const groups48 = (): Record<string, (string | null)[]> => ({
  A: ['MEX', 'ESP', 'GER', 'NZL'],
})

describe('campaign systems', () => {
  it('knows its rivalries both ways', () => {
    expect(isRivalry('ARG', 'BRA')).toBe(true)
    expect(isRivalry('BRA', 'ARG')).toBe(true)
    expect(isRivalry('USA', 'MEX')).toBe(true)
    expect(isRivalry('ESP', 'JPN')).toBe(false)
  })

  it('star quality follows the ratings', () => {
    expect(starOf('ESP')).toBeGreaterThan(starOf('NZL'))
    expect(starOf('ESP')).toBeLessThanOrEqual(1)
    expect(starOf('NZL')).toBeGreaterThanOrEqual(0)
  })

  it('form drift rewards wins and punishes losses, clamped', () => {
    const results: Record<number, MatchResult> = {
      1: { score: { home: 3, away: 0 } }, // MEX beat ESP (fixture 1: pos1 v pos2)
    }
    const src: CampaignSources = { groups: groups48(), results, bracket: null, format: 48 }
    expect(formDriftOf('MEX', src)).toBe(5)
    expect(formDriftOf('ESP', src)).toBe(-5)
    expect(formDriftOf('GER', src)).toBe(0)
  })

  it('MD3 stakes read the live table', () => {
    // MEX won both openers (9... 6 pts) → safe; NZL lost both → must-win
    const results: Record<number, MatchResult> = {
      1: { score: { home: 2, away: 0 } }, // MEX v ESP
      2: { score: { home: 0, away: 1 } }, // GER v NZL → NZL win? homePos3 v awayPos4: GER 0-1 NZL
      25: { score: { home: 1, away: 0 } }, // MD2 MEX v GER (1v3): MEX win
      26: { score: { home: 2, away: 0 } }, // MD2 NZL v ESP (4v2): NZL win
    }
    const src: CampaignSources = { groups: groups48(), results, bracket: null, format: 48 }
    expect(stakesOf('MEX', 'A', 3, src)).toBeLessThan(0) // six points — safe
    expect(stakesOf('ESP', 'A', 3, src)).toBe(1) // zero points — must-win
    expect(stakesOf('MEX', 'A', 1, src)).toBe(0) // stakes only exist on MD3
  })

  it('suspension burden accumulates yellows and respects the amnesty', () => {
    const yellowsFor = (n: number, count: number): MatchResult => ({
      score: { home: 1, away: 0 },
      events: Array.from({ length: count }, (_, i) => ({ min: 10 + i, side: 'home' as const, type: 'yellow' as const })),
    })
    const results: Record<number, MatchResult> = {
      1: yellowsFor(1, 3), // MEX pick up three bookings
      25: yellowsFor(25, 2), // and two more
    }
    const src: CampaignSources = { groups: groups48(), results, bracket: null, format: 48 }
    expect(suspensionBurden('MEX', 49, 'group', src)).toBe(1) // five yellows → one suspension
    expect(suspensionBurden('MEX', 49, 'sf', src)).toBe(0) // amnesty from the semis
    expect(suspensionBurden('ESP', 49, 'group', src)).toBe(0)
  })
})

describe('the enriched minute engine', () => {
  it('is fully deterministic under a fixed seed', () => {
    const a = simulateMatch('ESP', 'GER', { stage: 'qf', rivalry: false }, 1, makeRng('det'))
    const b = simulateMatch('ESP', 'GER', { stage: 'qf', rivalry: false }, 1, makeRng('det'))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('records stoppage-time events with bounded added minutes', () => {
    let sawPlus = false
    for (let i = 0; i < 60; i++) {
      const r = simulateMatch('BRA', 'ARG', { stage: 'group', rivalry: true }, 1.4, makeRng(`stop:${i}`))
      for (const e of r.events ?? []) {
        if (e.plus !== undefined) {
          sawPlus = true
          expect(e.min === 45 || e.min === 90).toBe(true)
          expect(e.plus).toBeGreaterThanOrEqual(1)
          expect(e.plus).toBeLessThanOrEqual(7)
        }
      }
    }
    expect(sawPlus).toBe(true)
  })

  it('produces the new event vocabulary and momentum log', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 80; i++) {
      const r = simulateMatch('FRA', 'ITA', { stage: 'group' }, 1.2, makeRng(`vocab:${i}`))
      for (const e of r.events ?? []) seen.add(e.type)
      expect(Array.isArray(r.momentum)).toBe(true)
      expect(r.momentum!.length).toBeGreaterThanOrEqual(17)
      expect(Array.isArray(r.tags)).toBe(true)
    }
    for (const t of ['sub', 'miss']) expect(seen.has(t)).toBe(true)
    // goals carry their chance quality
    let sawXg = false
    for (let i = 0; i < 10; i++) {
      const r = simulateMatch('ESP', 'NZL', { stage: 'group' }, 0.6, makeRng(`xg:${i}`))
      for (const e of r.events ?? []) if (e.type === 'goal' && e.xg !== undefined) sawXg = true
    }
    expect(sawXg).toBe(true)
  })

  it('tags routs and derbies', () => {
    let sawRout = false
    let sawDerby = false
    for (let i = 0; i < 60; i++) {
      const r = simulateMatch('ESP', 'NZL', { stage: 'group' }, 0.4, makeRng(`rout:${i}`))
      if ((r.tags ?? []).includes('rout')) sawRout = true
      const d = simulateMatch('ARG', 'BRA', { stage: 'group', rivalry: true }, 1, makeRng(`derby:${i}`))
      if ((d.tags ?? []).includes('derby')) sawDerby = true
    }
    expect(sawRout).toBe(true)
    expect(sawDerby).toBe(true)
  })

  it('campaign context moves the analytic odds', () => {
    const flat = matchOdds('CRO', 'SUI', { stage: 'group' }, 1)
    const inForm = matchOdds('CRO', 'SUI', { stage: 'group', formHome: 30, formAway: -20 }, 1)
    const suspended = matchOdds('CRO', 'SUI', { stage: 'group', suspHome: 2 }, 1)
    expect(inForm.home).toBeGreaterThan(flat.home)
    expect(suspended.home).toBeLessThan(flat.home)
  })

  it('BTTS analytic odds track the minute engine distribution', () => {
    const odds = matchOdds('CRO', 'SUI', { stage: 'group' }, 1)
    let btts = 0
    const N = 250
    for (let i = 0; i < N; i++) {
      const r = simulateMatch('CRO', 'SUI', { stage: 'group' }, 1, makeRng(`btts:${i}`))
      if ((r.score.home ?? 0) > 0 && (r.score.away ?? 0) > 0) btts++
    }
    // analytic BTTS from the grid: reconstruct via 1 − P(h=0) − P(a=0) + P(0-0)
    const sim = btts / N
    expect(Math.abs(sim - (1 - Math.exp(-odds.lamHome) - Math.exp(-odds.lamAway) + Math.exp(-odds.lamHome - odds.lamAway)))).toBeLessThan(0.14)
  })
})
