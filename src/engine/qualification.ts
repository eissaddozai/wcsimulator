import { BASE_QUOTA, NATIONS, NATION_BY_ID, byConfed, ratingOf } from '../data/nations'
import type { Rng } from './rng'
import { beta, gumbel } from './rng'
import { simulateMatch, koWinner } from './simulate'
import type { Confed } from './types'

const RTILDE = (id: string) => (ratingOf(id) - 1500) / 175

/**
 * Plackett–Luce sampling without replacement, implemented as Gumbel-top-k.
 * θ=0 short-circuits to a deterministic top-k by rating.
 */
function sampleK(pool: string[], k: number, theta: number, rng: Rng): string[] {
  if (k <= 0) return []
  if (theta <= 0) {
    return pool
      .slice()
      .sort((a, b) => ratingOf(b) - ratingOf(a))
      .slice(0, k)
  }
  const b = beta(theta)
  return pool
    .map((id) => ({ id, key: b * RTILDE(id) + gumbel(rng) }))
    .sort((x, y) => y.key - x.key)
    .slice(0, k)
    .map((x) => x.id)
}

export interface QualificationOutcome {
  entries: string[]
  playoffLog: string[]
}

/**
 * Fills only the unfilled slots, honoring manual picks. Hosts are unconditional locks.
 * The two flexible inter-confederation slots are decided by a simulated FIFA Play-Off
 * Tournament (6 entrants: 1 AFC / 1 CAF / 1 CONMEBOL / 1 OFC / 2 CONCACAF; the two
 * highest-rated get byes to the finals) — unless manual overflow already consumed them.
 */
export function completeQualification(
  partial: readonly string[],
  hosts: readonly string[],
  theta: number,
  rng: Rng,
): QualificationOutcome {
  const picked = new Set(partial)
  for (const h of hosts) picked.add(h)
  const log: string[] = []

  const countOf = (c: Confed) => [...picked].filter((id) => NATION_BY_ID.get(id)?.confed === c).length
  let flexUsed = (Object.keys(BASE_QUOTA) as Confed[]).reduce(
    (acc, c) => acc + (c === 'UEFA' ? 0 : Math.max(0, countOf(c) - BASE_QUOTA[c])),
    0,
  )

  // fill each confederation to its base quota
  for (const confed of Object.keys(BASE_QUOTA) as Confed[]) {
    const need = BASE_QUOTA[confed] - countOf(confed)
    if (need <= 0) continue
    const pool = byConfed(confed)
      .map((n) => n.id)
      .filter((id) => !picked.has(id))
    for (const id of sampleK(pool, need, theta, rng)) picked.add(id)
  }

  // flexible playoff slots
  const flexRemaining = Math.max(0, 2 - flexUsed)
  if (flexRemaining > 0) {
    const entrantSpec: [Confed, number][] = [
      ['AFC', 1],
      ['CAF', 1],
      ['CONMEBOL', 1],
      ['OFC', 1],
      ['CONCACAF', 2],
    ]
    const entrants: string[] = []
    for (const [confed, k] of entrantSpec) {
      const pool = byConfed(confed)
        .map((n) => n.id)
        .filter((id) => !picked.has(id))
      entrants.push(...sampleK(pool, k, Math.max(theta, 0.4), rng))
    }
    const seeded = entrants.slice().sort((a, b) => ratingOf(b) - ratingOf(a))
    const [bye1, bye2, s1, s2, s3, s4] = seeded
    const name = (id: string | undefined) => (id ? NATION_BY_ID.get(id)?.name ?? id : '?')
    const winners: string[] = []
    const play = (h: string, a: string): string => {
      const r = simulateMatch(h, a, { stage: 'r32' }, theta, rng)
      const w = koWinner(h, a, r)!
      const suffix = r.pens ? ` (pens ${r.pens.home}–${r.pens.away})` : r.et ? ' (aet)' : ''
      log.push(
        `${name(h)} ${(r.score.home ?? 0) + (r.et?.home ?? 0)}–${(r.score.away ?? 0) + (r.et?.away ?? 0)} ${name(a)}${suffix} — ${name(w)} advance`,
      )
      return w
    }
    if (s1 && s2 && s3 && s4 && bye1 && bye2) {
      log.push('FIFA Play-Off Tournament — two spots at stake')
      const w1 = play(s1, s4)
      const w2 = play(s2, s3)
      const f1 = play(bye1, w1)
      const f2 = play(bye2, w2)
      winners.push(f1)
      if (winners.length < flexRemaining) winners.push(f2)
      else log.push(`${name(f2)} miss out — only one playoff spot remained`)
    }
    for (const w of winners.slice(0, flexRemaining)) picked.add(w)
  }

  // safety: trim/refill to exactly 48 (can only trigger with malformed manual input)
  const entries = [...picked]
  if (entries.length > 48) entries.length = 48
  while (entries.length < 48) {
    const pool = NATIONS.map((n) => n.id).filter((id) => !entries.includes(id))
    const next = sampleK(pool, 1, theta, rng)[0]
    if (!next) break
    entries.push(next)
  }
  return { entries, playoffLog: log }
}
