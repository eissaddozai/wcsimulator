import { ratingOf } from '../data/nations'
import type { Rng } from './rng'
import { poisson } from './rng'
import type { MatchResult } from './types'

/**
 * Rating difference → expected goals via a calibrated log-linear model, then bivariate
 * Poisson (shared component ⇒ score correlation). Knockout adds 1/3-intensity extra
 * time, then a best-of-5 shootout with sudden death.
 */
export function simulateMatch(homeId: string, awayId: string, knockout: boolean, theta: number, rng: Rng): MatchResult {
  const delta = (ratingOf(homeId) - ratingOf(awayId)) / 175
  const T = Math.pow(3, Math.min(Math.max(theta, 0), 2) - 1)
  const c = 1.3
  const alpha = 0.45
  // clamp the exponent so chalk mode sharpens gaps without absurd scorelines
  const edge = Math.min(Math.max((alpha * delta) / T, -1.5), 1.5)
  const lamHome = c * Math.exp(edge)
  const lamAway = c * Math.exp(-edge)
  const lam3 = 0.1
  const shared = poisson(rng, lam3)
  const hs = poisson(rng, Math.max(lamHome - lam3, 0.05)) + shared
  const as = poisson(rng, Math.max(lamAway - lam3, 0.05)) + shared
  const result: MatchResult = { score: { home: hs, away: as }, simulated: true }
  if (!knockout || hs !== as) return result

  // extra time at one-third intensity
  const eh = poisson(rng, Math.max(lamHome / 3 - 0.02, 0.02))
  const ea = poisson(rng, Math.max(lamAway / 3 - 0.02, 0.02))
  result.et = { home: eh, away: ea }
  if (eh !== ea) return result

  result.pens = shootout(delta, rng)
  return result
}

function shootout(delta: number, rng: Rng): { home: number; away: number } {
  const pHome = 0.75 + 0.03 * Math.tanh(delta)
  const pAway = 0.75 - 0.03 * Math.tanh(delta)
  let h = 0
  let a = 0
  // best of 5, alternating, with early termination
  for (let round = 1; round <= 5; round++) {
    if (rng() < pHome) h++
    if (h > a + (5 - round) || a > h + (5 - round + 1)) {
      // decided before away kicks — still record away attempt for realism? keep simple
    }
    if (rng() < pAway) a++
    const remaining = 5 - round
    if (h > a + remaining || a > h + remaining) return { home: h, away: a }
  }
  // sudden death, capped at 30 rounds then lots via rng coin
  for (let round = 0; round < 30; round++) {
    const sh = rng() < pHome ? 1 : 0
    const sa = rng() < pAway ? 1 : 0
    h += sh
    a += sa
    if (sh !== sa) return { home: h, away: a }
  }
  return rng() < 0.5 ? { home: h + 1, away: a } : { home: h, away: a + 1 }
}

/** Winner of a knockout result (score + et + pens must decide). */
export function koWinner(homeId: string, awayId: string, r: MatchResult): string | null {
  let h = r.score.home
  let a = r.score.away
  if (h !== a) return h > a ? homeId : awayId
  if (r.et) {
    h += r.et.home
    a += r.et.away
    if (h !== a) return h > a ? homeId : awayId
  }
  if (r.pens) {
    if (r.pens.home !== r.pens.away) return r.pens.home > r.pens.away ? homeId : awayId
  }
  return null
}

export function koLoser(homeId: string, awayId: string, r: MatchResult): string | null {
  const w = koWinner(homeId, awayId, r)
  if (!w) return null
  return w === homeId ? awayId : homeId
}
