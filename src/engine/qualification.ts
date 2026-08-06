import { BASE_QUOTA, NATIONS, NATION_BY_ID, byConfed, rankOf, ratingOf } from '../data/nations'
import { QUAL_FLAVOR } from './campaign'
import { PLAYOFF64_SPEC, seatCanExist } from './playoffs'
import type { Rng } from './rng'
import { beta, gumbel } from './rng'
import { quotasFor, playoffAllocationFor } from './selection'
import { simulateMatch, koWinner } from './simulate'
import type { Confed, Format } from './types'

const RTILDE = (id: string) => (ratingOf(id) - 1500) / 175

/** How the qualifying simulator reads the world — five modalities from prophecy to anarchy. */
export type QualMode = 'world-order' | 'form-book' | 'balanced' | 'giant-killers' | 'total-anarchy'

export const QUAL_MODES: { id: QualMode; name: string; blurb: string }[] = [
  { id: 'world-order', name: 'World Order', blurb: 'The rankings are destiny — every confederation sends exactly who it should.' },
  { id: 'form-book', name: 'The Form Book', blurb: 'The last twelve months decide — hot streaks qualify, faded giants sweat.' },
  { id: 'balanced', name: 'As It Happens', blurb: 'Calibrated realism — favorites usually make it, somebody famous always misses.' },
  { id: 'giant-killers', name: 'Giant Killers', blurb: 'Qualification is a trap — two or three shock absentees per confederation.' },
  { id: 'total-anarchy', name: 'Total Anarchy', blurb: 'Names out of a hat. San Marino dreams tonight.' },
]

interface ModeProfile {
  /** multiplier on the rating bias b(θ) — 0 flattens class entirely */
  bias: number
  /** scale on the Gumbel noise that produces upsets */
  noise: number
  /** how many effective rating points each point of 12-month form is worth */
  formWeight: number
  /** skip sampling — take the top-k by the (form-adjusted) strength read */
  deterministic?: boolean
}

const MODE_PROFILES: Record<QualMode, ModeProfile> = {
  'world-order': { bias: 1, noise: 0, formWeight: 0, deterministic: true },
  'form-book': { bias: 1.15, noise: 0.75, formWeight: 2.2 },
  balanced: { bias: 1, noise: 1, formWeight: 0 },
  'giant-killers': { bias: 0.4, noise: 1.35, formWeight: 0 },
  'total-anarchy': { bias: 0, noise: 1, formWeight: 0 },
}

/**
 * Plackett–Luce sampling without replacement, implemented as Gumbel-top-k, shaped by
 * the qualifying modality. θ=0 or a deterministic mode short-circuits to strict top-k.
 */
function sampleK(pool: string[], k: number, theta: number, rng: Rng, mode: QualMode = 'balanced'): string[] {
  if (k <= 0) return []
  const prof = MODE_PROFILES[mode]
  const eff = (id: string): number => {
    if (prof.formWeight === 0) return RTILDE(id)
    const n = NATION_BY_ID.get(id)!
    return (n.rating + prof.formWeight * n.form - 1500) / 175
  }
  if (prof.deterministic || theta <= 0) {
    return pool
      .slice()
      .sort((a, b) => eff(b) - eff(a))
      .slice(0, k)
  }
  const b = beta(theta) * prof.bias
  return pool
    .map((id) => ({ id, key: b * eff(id) + prof.noise * gumbel(rng) }))
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
 *
 * 48-team format: two flexible inter-confederation slots decided by a simulated FIFA
 * Play-Off Tournament (6 entrants; the two highest-rated get byes to the finals).
 * 64-team format: 60 direct places, then FOUR intercontinental play-off tournaments
 * (16 entrants, berths 61–64, pinned bracket allocation per FORMAT-64).
 */
export function completeQualification(
  partial: readonly string[],
  hosts: readonly string[],
  theta: number,
  rng: Rng,
  format: Format = 48,
  mode: QualMode = 'balanced',
): QualificationOutcome {
  const picked = new Set(partial)
  for (const h of hosts) picked.add(h)
  const log: string[] = [QUAL_FLAVOR[mode] ?? '']
  const quotas = quotasFor(format)
  const name = (id: string | undefined) => (id ? NATION_BY_ID.get(id)?.name ?? id : '?')

  const countOf = (c: Confed) => [...picked].filter((id) => NATION_BY_ID.get(id)?.confed === c).length
  const flexUsed =
    format === 48
      ? (Object.keys(BASE_QUOTA) as Confed[]).reduce(
          (acc, c) => acc + (c === 'UEFA' ? 0 : Math.max(0, countOf(c) - BASE_QUOTA[c])),
          0,
        )
      : 0

  // fill each confederation to its base quota
  for (const confed of Object.keys(quotas) as Confed[]) {
    const need = quotas[confed] - countOf(confed)
    if (need <= 0) continue
    const pool = byConfed(confed)
      .map((n) => n.id)
      .filter((id) => !picked.has(id))
    for (const id of sampleK(pool, need, theta, rng, mode)) picked.add(id)
  }

  const play = (h: string, a: string): string => {
    const r = simulateMatch(h, a, { stage: 'r32' }, theta, rng)
    const w = koWinner(h, a, r)!
    const suffix = r.pens ? ` (pens ${r.pens.home}–${r.pens.away})` : r.et ? ' (aet)' : ''
    log.push(
      `${name(h)} ${(r.score.home ?? 0) + (r.et?.home ?? 0)}–${(r.score.away ?? 0) + (r.et?.away ?? 0)} ${name(a)}${suffix} — ${name(w)} advance`,
    )
    return w
  }

  if (format === 64) {
    // the four intercontinental play-off tournaments, berths 61–64
    const alloc = playoffAllocationFor(64)
    const entrantsByConfed: Partial<Record<Confed, string[]>> = {}
    for (const confed of Object.keys(alloc) as Confed[]) {
      if (alloc[confed] <= 0) continue
      const pool = byConfed(confed)
        .map((n) => n.id)
        .filter((id) => !picked.has(id))
      entrantsByConfed[confed] = sampleK(pool, alloc[confed], Math.max(theta, 0.4), rng, mode).sort(
        (a, b) => rankOf(a) - rankOf(b),
      )
    }
    const pick = (confed: string, n: number): string | undefined => entrantsByConfed[confed as Confed]?.[n - 1]
    // resolve a semifinal, granting a bye when a seat is structurally impossible
    const semifinal = (spec: [[string, number], [string, number]]): string | undefined => {
      const [h, a] = [pick(...spec[0]), pick(...spec[1])]
      if (h && a) return play(h, a)
      const present = h ?? a
      const missing = h ? spec[1] : spec[0]
      if (present && !seatCanExist(missing[0], missing[1])) {
        log.push(`${name(present)} receive a bye — the ${missing[0]} ${missing[1]} seat cannot be filled`)
        return present
      }
      return undefined
    }
    for (const t of PLAYOFF64_SPEC) {
      log.push(`Play-off Tournament ${t.id} — berth ${t.berth}`)
      const w1 = semifinal(t.sf1 as [[string, number], [string, number]])
      const w2 = semifinal(t.sf2 as [[string, number], [string, number]])
      if (!w1 || !w2) continue
      const winner = play(w1, w2)
      picked.add(winner)
      log.push(`${name(winner)} take berth ${t.berth}`)
    }
  } else {
    // flexible playoff slots (48-team format)
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
        entrants.push(...sampleK(pool, k, Math.max(theta, 0.4), rng, mode))
      }
      const seeded = entrants.slice().sort((a, b) => ratingOf(b) - ratingOf(a))
      const [bye1, bye2, s1, s2, s3, s4] = seeded
      const winners: string[] = []
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
  }

  // safety: trim/refill to the exact field size (can only trigger with malformed manual input)
  const target = format
  const entries = [...picked]
  if (entries.length > target) entries.length = target
  while (entries.length < target) {
    const pool = NATIONS.map((n) => n.id).filter((id) => !entries.includes(id))
    const next = sampleK(pool, 1, theta, rng, mode)[0]
    if (!next) break
    entries.push(next)
  }
  return { entries, playoffLog: log }
}
