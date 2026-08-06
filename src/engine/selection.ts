import { BASE_QUOTA, NATION_BY_ID } from '../data/nations'
import type { Confed } from './types'

/**
 * The 46 direct places are exact per confederation. The last two places are won on the
 * pitch: six entrants — two from CONCACAF, one each from CAF, AFC, CONMEBOL, and OFC,
 * never UEFA — contest the FIFA Play-off Tournament.
 */
export const DIRECT_TOTAL = 46
export const PLAYOFF_ENTRANTS = 6
export const PLAYOFF_ALLOCATION: Record<Confed, number> = {
  UEFA: 0,
  CAF: 1,
  AFC: 1,
  CONCACAF: 2,
  CONMEBOL: 1,
  OFC: 1,
}

export interface QuotaStatus {
  counts: Record<Confed, number>
  total: number
  /** all 46 direct places filled, every confederation exactly at quota, hosts in */
  complete: boolean
  /** null when a nation may still take a direct place in its confederation */
  capReason: (confed: Confed) => string | null
}

export function quotaStatus(entries: readonly string[], hosts: readonly string[]): QuotaStatus {
  const counts: Record<Confed, number> = { UEFA: 0, CAF: 0, AFC: 0, CONCACAF: 0, CONMEBOL: 0, OFC: 0 }
  for (const id of entries) {
    const n = NATION_BY_ID.get(id)
    if (n) counts[n.confed]++
  }
  const total = entries.length
  const hostsIn = hosts.every((h) => entries.includes(h))
  const complete =
    total === DIRECT_TOTAL &&
    hostsIn &&
    (Object.keys(counts) as Confed[]).every((c) => counts[c] === BASE_QUOTA[c])

  const capReason = (confed: Confed): string | null => {
    if (counts[confed] < BASE_QUOTA[confed]) return null
    return confed === 'UEFA'
      ? 'UEFA is capped at 16 — Europe never enters the Play-off Tournament'
      : `${confed}'s direct places are full — the next tap becomes a Play-off Tournament entrant`
  }

  return { counts, total, complete, capReason }
}

/** true when adding this nation keeps the direct selection legal */
export function canAdd(
  entries: readonly string[],
  hosts: readonly string[],
  id: string,
): { ok: boolean; reason: string | null } {
  if (entries.includes(id)) return { ok: false, reason: 'Already selected' }
  if (entries.length >= DIRECT_TOTAL) return { ok: false, reason: 'All 46 direct places are filled' }
  const n = NATION_BY_ID.get(id)
  if (!n) return { ok: false, reason: 'Unknown nation' }
  const reason = quotaStatus(entries, hosts).capReason(n.confed)
  return reason ? { ok: false, reason } : { ok: true, reason: null }
}

/** true when this nation may be designated a Play-off Tournament entrant */
export function canAddPlayoff(
  entries: readonly string[],
  playoffTeams: readonly string[],
  id: string,
): { ok: boolean; reason: string | null } {
  if (entries.includes(id)) return { ok: false, reason: 'Already holds a direct place' }
  if (playoffTeams.includes(id)) return { ok: false, reason: 'Already a play-off entrant' }
  if (playoffTeams.length >= PLAYOFF_ENTRANTS) return { ok: false, reason: 'All six play-off places are taken' }
  const n = NATION_BY_ID.get(id)
  if (!n) return { ok: false, reason: 'Unknown nation' }
  if (n.confed === 'UEFA') return { ok: false, reason: 'UEFA never enters the Play-off Tournament' }
  const used = playoffTeams.filter((t) => NATION_BY_ID.get(t)?.confed === n.confed).length
  if (used >= PLAYOFF_ALLOCATION[n.confed]) {
    return {
      ok: false,
      reason:
        PLAYOFF_ALLOCATION[n.confed] === 2
          ? `Both of ${n.confed}'s play-off places are taken`
          : `${n.confed}'s play-off place is taken`,
    }
  }
  return { ok: true, reason: null }
}
