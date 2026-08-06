import { NATION_BY_ID, rankOf, ratingOf } from '../data/nations'
import type { Rng } from './rng'
import { beta, gaussian, shuffle } from './rng'
import type { Pots, StrategyId } from './types'

export const STRATEGY_LABELS: Record<StrategyId, string> = {
  official: 'Official',
  noisy: 'Noisy Ranking',
  'pl-draft': 'Luck of the Draft',
  form: 'Form',
  chaos: 'Full Chaos',
}

export const STRATEGY_BLURBS: Record<StrategyId, string> = {
  official: 'Strict FIFA-ranking pots — deterministic chalk.',
  noisy: 'Gaussian wobble around the official pots; the chaos knob widens it.',
  'pl-draft': 'Sequential weighted draft — early luck compounds into gatecrashers.',
  form: 'Hot streaks jump a pot; faded giants slip.',
  chaos: 'Uniform shuffle. Brazil in Pot 4 is on the table.',
}

const RTILDE = (id: string) => (ratingOf(id) - 1500) / 175

function slice(hostless: string[], hosts: readonly string[]): Pots {
  const n = 12 - hosts.length
  return [
    [...hosts, ...hostless.slice(0, n)],
    hostless.slice(n, n + 12),
    hostless.slice(n + 12, n + 24),
    hostless.slice(n + 24, n + 36),
  ]
}

/**
 * Five seeding strategies, one signature. Invariants: hosts are always Pot 1; output is 4×12.
 * Manual drag-and-drop is a layered override on the result, not a strategy.
 */
export function seedPots(
  entries: readonly string[],
  hostList: readonly string[],
  strategy: StrategyId,
  theta: number,
  rng: Rng,
): Pots {
  const hosts = hostList.filter((h) => entries.includes(h))
  const rest = entries.filter((id) => !hosts.includes(id))

  const byOfficial = (ids: string[]) =>
    ids.slice().sort((a, b) => rankOf(a) - rankOf(b) || a.localeCompare(b))

  switch (strategy) {
    case 'official':
      return slice(byOfficial(rest), hosts)
    case 'noisy': {
      const sigma = 40 * Math.max(theta, 0)
      const jittered = rest
        .map((id) => ({ id, key: ratingOf(id) + sigma * gaussian(rng) }))
        .sort((a, b) => b.key - a.key)
        .map((x) => x.id)
      return slice(jittered, hosts)
    }
    case 'pl-draft': {
      const b = beta(Math.max(theta, 0.15))
      const remaining = rest.slice()
      const drafted: string[] = []
      while (remaining.length > 0) {
        const weights = remaining.map((id) => Math.exp(b * RTILDE(id)))
        const total = weights.reduce((s, w) => s + w, 0)
        let r = rng() * total
        let idx = 0
        for (let i = 0; i < weights.length; i++) {
          r -= weights[i]!
          if (r <= 0) {
            idx = i
            break
          }
        }
        drafted.push(remaining.splice(idx, 1)[0]!)
      }
      return slice(drafted, hosts)
    }
    case 'form': {
      const b = beta(Math.max(theta, 0.5))
      const eff = (id: string) => {
        const n = NATION_BY_ID.get(id)!
        const f = Math.min(Math.max(1 + n.form / 200, 0.85), 1.15)
        return n.rating * f
      }
      const remaining = rest.slice()
      const drafted: string[] = []
      while (remaining.length > 0) {
        const weights = remaining.map((id) => Math.exp((b * (eff(id) - 1500)) / 175))
        const total = weights.reduce((s, w) => s + w, 0)
        let r = rng() * total
        let idx = 0
        for (let i = 0; i < weights.length; i++) {
          r -= weights[i]!
          if (r <= 0) {
            idx = i
            break
          }
        }
        drafted.push(remaining.splice(idx, 1)[0]!)
      }
      return slice(drafted, hosts)
    }
    case 'chaos':
      return slice(shuffle(rest, rng), hosts)
  }
}
