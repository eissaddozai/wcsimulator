import type { Rng } from './rng'
import { shuffle } from './rng'
import type { GroupId, StandingRow, ThirdRank } from './types'

/**
 * Cross-group ranking of the 12 third-placed teams: points → GD → GF → FIFA ranking →
 * seeded lots. Computed live over provisional standings during the group stage; only
 * R32 generation is gated on completeness.
 */
export function rankThirds(
  thirdRows: { group: GroupId; row: StandingRow; complete: boolean }[],
  rankOf: (id: string) => number,
  lotsRng: Rng,
): ThirdRank[] {
  const pre = shuffle(thirdRows, lotsRng)
  const sorted = pre.sort(
    (a, b) =>
      b.row.points - a.row.points ||
      b.row.gd - a.row.gd ||
      b.row.gf - a.row.gf ||
      rankOf(a.row.id) - rankOf(b.row.id),
  )
  return sorted.map((t, i) => ({
    id: t.row.id,
    group: t.group,
    rank: i + 1,
    qualified: i < 8,
    provisional: !t.complete,
    row: t.row,
  }))
}
