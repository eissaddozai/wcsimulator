import { BASE_QUOTA, BASE_QUOTA_64, NATION_BY_ID } from '../data/nations'
import type { Confed, Format } from './types'

/**
 * Intercontinental play-off allocation (64-team format), pinned by the user: OFC holds
 * exactly one automatic berth and one play-off seat; its former second seat belongs to
 * UEFA as their fourth. (CONMEBOL stays at 2 — with 8 of its 10 members qualifying
 * directly, only 2 can ever enter.)
 */
export const PLAYOFF_ALLOCATION_64: Record<Confed, number> = {
  UEFA: 4,
  CAF: 3,
  AFC: 3,
  CONCACAF: 3,
  CONMEBOL: 2,
  OFC: 1,
}
export function quotasFor(format: Format): Record<Confed, number> {
  return format === 64 ? BASE_QUOTA_64 : BASE_QUOTA
}
export function playoffAllocationFor(format: Format): Record<Confed, number> {
  return format === 64 ? PLAYOFF_ALLOCATION_64 : PLAYOFF_ALLOCATION
}
export function directTotalFor(format: Format): number {
  return format === 64 ? 60 : 46
}
export function playoffEntrantsFor(format: Format): number {
  return format === 64 ? 16 : 6
}
export function fieldSizeFor(format: Format): number {
  return format === 64 ? 64 : 48
}

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

export function quotaStatus(entries: readonly string[], hosts: readonly string[], format: Format = 48): QuotaStatus {
  const counts: Record<Confed, number> = { UEFA: 0, CAF: 0, AFC: 0, CONCACAF: 0, CONMEBOL: 0, OFC: 0 }
  for (const id of entries) {
    const n = NATION_BY_ID.get(id)
    if (n) counts[n.confed]++
  }
  const quotas = quotasFor(format)
  const total = entries.length
  const hostsIn = hosts.every((h) => entries.includes(h))
  const complete =
    total === directTotalFor(format) &&
    hostsIn &&
    (Object.keys(counts) as Confed[]).every((c) => counts[c] === quotas[c])

  const capReason = (confed: Confed): string | null => {
    if (counts[confed] < quotas[confed]) return null
    return confed === 'UEFA'
      ? `UEFA is capped at ${quotas.UEFA} — the next tap becomes a Play-off Tournament entrant`
      : `${confed}'s direct places are full — the next tap becomes a Play-off Tournament entrant`
  }

  return { counts, total, complete, capReason }
}

/** true when adding this nation keeps the direct selection legal */
export function canAdd(
  entries: readonly string[],
  hosts: readonly string[],
  id: string,
  format: Format = 48,
): { ok: boolean; reason: string | null } {
  if (entries.includes(id)) return { ok: false, reason: 'Already selected' }
  if (entries.length >= directTotalFor(format))
    return { ok: false, reason: `All ${directTotalFor(format)} direct places are filled` }
  const n = NATION_BY_ID.get(id)
  if (!n) return { ok: false, reason: 'Unknown nation' }
  const reason = quotaStatus(entries, hosts, format).capReason(n.confed)
  return reason ? { ok: false, reason } : { ok: true, reason: null }
}

/** true when this nation may be designated a Play-off Tournament entrant */
export function canAddPlayoff(
  entries: readonly string[],
  playoffTeams: readonly string[],
  id: string,
  format: Format = 48,
): { ok: boolean; reason: string | null } {
  if (entries.includes(id)) return { ok: false, reason: 'Already holds a direct place' }
  if (playoffTeams.includes(id)) return { ok: false, reason: 'Already a play-off entrant' }
  if (playoffTeams.length >= playoffEntrantsFor(format))
    return { ok: false, reason: `All ${playoffEntrantsFor(format)} play-off places are taken` }
  const n = NATION_BY_ID.get(id)
  if (!n) return { ok: false, reason: 'Unknown nation' }
  const alloc = playoffAllocationFor(format)
  if (alloc[n.confed] === 0) return { ok: false, reason: `${n.confed} never enters the Play-off Tournament` }
  const used = playoffTeams.filter((t) => NATION_BY_ID.get(t)?.confed === n.confed).length
  if (used >= alloc[n.confed]) {
    return {
      ok: false,
      reason:
        alloc[n.confed] > 1
          ? `All ${alloc[n.confed]} of ${n.confed}'s play-off places are taken`
          : `${n.confed}'s play-off place is taken`,
    }
  }
  return { ok: true, reason: null }
}
