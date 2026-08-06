import { BASE_QUOTA, FLEX_SLOTS, HOSTS, NATION_BY_ID } from '../data/nations'
import type { Confed } from './types'

export interface QuotaStatus {
  counts: Record<Confed, number>
  flexUsed: number
  total: number
  complete: boolean
  /** null when a nation may still be added to its confederation */
  capReason: (confed: Confed) => string | null
}

export function quotaStatus(entries: readonly string[]): QuotaStatus {
  const counts: Record<Confed, number> = { UEFA: 0, CAF: 0, AFC: 0, CONCACAF: 0, CONMEBOL: 0, OFC: 0 }
  for (const id of entries) {
    const n = NATION_BY_ID.get(id)
    if (n) counts[n.confed]++
  }
  const flexUsed = (Object.keys(counts) as Confed[]).reduce(
    (acc, c) => acc + (c === 'UEFA' ? 0 : Math.max(0, counts[c] - BASE_QUOTA[c])),
    0,
  )
  const total = entries.length
  const hostsIn = HOSTS.every((h) => entries.includes(h))
  const complete =
    total === 48 &&
    hostsIn &&
    counts.UEFA === BASE_QUOTA.UEFA &&
    (Object.keys(counts) as Confed[]).every((c) => c === 'UEFA' || counts[c] >= BASE_QUOTA[c]) &&
    flexUsed <= FLEX_SLOTS

  const capReason = (confed: Confed): string | null => {
    if (confed === 'UEFA') {
      return counts.UEFA >= BASE_QUOTA.UEFA ? 'UEFA is capped at 16 — the playoff slots never go to Europe' : null
    }
    if (counts[confed] < BASE_QUOTA[confed]) return null
    if (flexUsed < FLEX_SLOTS) return null
    return `${confed} is full — both inter-confederation playoff slots are already used`
  }

  return { counts, flexUsed, total, complete, capReason }
}

/** true when adding this nation keeps the selection legal */
export function canAdd(entries: readonly string[], id: string): { ok: boolean; reason: string | null } {
  if (entries.includes(id)) return { ok: false, reason: 'Already selected' }
  if (entries.length >= 48) return { ok: false, reason: 'All 48 slots are filled' }
  const n = NATION_BY_ID.get(id)
  if (!n) return { ok: false, reason: 'Unknown nation' }
  const reason = quotaStatus(entries).capReason(n.confed)
  return reason ? { ok: false, reason } : { ok: true, reason: null }
}
