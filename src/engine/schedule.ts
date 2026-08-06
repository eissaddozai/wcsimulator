import type { GroupFixture, GroupId, KoMatch, PotNumber, Position } from './types'

export const GROUP_IDS: GroupId[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

/**
 * Per-group pot→position pattern. Verified for Group A from the real 2026 fixture list
 * (pot 3 → A2, pot 2 → A3, pot 4 → A4); provisionally applied to all groups until the
 * other 11 official patterns are transcribed. Positions affect fixture order only.
 */
export const POT_TO_POSITION: Record<PotNumber, Position> = { 1: 1, 3: 2, 2: 3, 4: 4 }

/** Matchday pairing pattern by draw position (verified): MD1 1v2 3v4 · MD2 1v3 4v2 · MD3 4v1 2v3 */
const MATCHDAY_PATTERN: [Position, Position][][] = [
  [
    [1, 2],
    [3, 4],
  ],
  [
    [1, 3],
    [4, 2],
  ],
  [
    [4, 1],
    [2, 3],
  ],
]

/**
 * Frozen synthetic numbering (matchday-major): MD1 = 1–24 in group order A→L,
 * MD2 = 25–48, MD3 = 49–72. Locked by a unit test; a schemaVersion migration remaps
 * if the official 1–72 list is adopted later.
 */
export const GROUP_FIXTURES: GroupFixture[] = (() => {
  const out: GroupFixture[] = []
  for (let md = 0; md < 3; md++) {
    for (let g = 0; g < 12; g++) {
      for (let f = 0; f < 2; f++) {
        const pair = MATCHDAY_PATTERN[md]![f]!
        out.push({
          number: md * 24 + g * 2 + f + 1,
          group: GROUP_IDS[g]!,
          matchday: (md + 1) as 1 | 2 | 3,
          homePos: pair[0],
          awayPos: pair[1],
        })
      }
    }
  }
  return out
})()

export function fixturesOfGroup(group: GroupId): GroupFixture[] {
  return GROUP_FIXTURES.filter((f) => f.group === group)
}

/** Official Round of 32 slot map (matches 73–88), verified per-row. */
export const KO_MATCHES: KoMatch[] = [
  { number: 73, stage: 'R32', home: { kind: 'runnerUp', group: 'A' }, away: { kind: 'runnerUp', group: 'B' } },
  { number: 74, stage: 'R32', home: { kind: 'winner', group: 'E' }, away: { kind: 'third', cands: ['A', 'B', 'C', 'D', 'F'] } },
  { number: 75, stage: 'R32', home: { kind: 'winner', group: 'F' }, away: { kind: 'runnerUp', group: 'C' } },
  { number: 76, stage: 'R32', home: { kind: 'winner', group: 'C' }, away: { kind: 'runnerUp', group: 'F' } },
  { number: 77, stage: 'R32', home: { kind: 'winner', group: 'I' }, away: { kind: 'third', cands: ['C', 'D', 'F', 'G', 'H'] } },
  { number: 78, stage: 'R32', home: { kind: 'runnerUp', group: 'E' }, away: { kind: 'runnerUp', group: 'I' } },
  { number: 79, stage: 'R32', home: { kind: 'winner', group: 'A' }, away: { kind: 'third', cands: ['C', 'E', 'F', 'H', 'I'] } },
  { number: 80, stage: 'R32', home: { kind: 'winner', group: 'L' }, away: { kind: 'third', cands: ['E', 'H', 'I', 'J', 'K'] } },
  { number: 81, stage: 'R32', home: { kind: 'winner', group: 'D' }, away: { kind: 'third', cands: ['B', 'E', 'F', 'I', 'J'] } },
  { number: 82, stage: 'R32', home: { kind: 'winner', group: 'G' }, away: { kind: 'third', cands: ['A', 'E', 'H', 'I', 'J'] } },
  { number: 83, stage: 'R32', home: { kind: 'winner', group: 'K' }, away: { kind: 'third', cands: ['D', 'E', 'I', 'J', 'L'] } },
  { number: 84, stage: 'R32', home: { kind: 'winner', group: 'H' }, away: { kind: 'runnerUp', group: 'J' } },
  { number: 85, stage: 'R32', home: { kind: 'winner', group: 'B' }, away: { kind: 'third', cands: ['E', 'F', 'G', 'I', 'J'] } },
  { number: 86, stage: 'R32', home: { kind: 'winner', group: 'J' }, away: { kind: 'runnerUp', group: 'H' } },
  { number: 87, stage: 'R32', home: { kind: 'runnerUp', group: 'K' }, away: { kind: 'runnerUp', group: 'L' } },
  { number: 88, stage: 'R32', home: { kind: 'runnerUp', group: 'D' }, away: { kind: 'runnerUp', group: 'G' } },
  // Round of 16
  { number: 89, stage: 'R16', home: { kind: 'matchWinner', match: 74 }, away: { kind: 'matchWinner', match: 77 } },
  { number: 90, stage: 'R16', home: { kind: 'matchWinner', match: 73 }, away: { kind: 'matchWinner', match: 75 } },
  { number: 91, stage: 'R16', home: { kind: 'matchWinner', match: 76 }, away: { kind: 'matchWinner', match: 78 } },
  { number: 92, stage: 'R16', home: { kind: 'matchWinner', match: 79 }, away: { kind: 'matchWinner', match: 80 } },
  { number: 93, stage: 'R16', home: { kind: 'matchWinner', match: 83 }, away: { kind: 'matchWinner', match: 84 } },
  { number: 94, stage: 'R16', home: { kind: 'matchWinner', match: 81 }, away: { kind: 'matchWinner', match: 82 } },
  { number: 95, stage: 'R16', home: { kind: 'matchWinner', match: 86 }, away: { kind: 'matchWinner', match: 88 } },
  { number: 96, stage: 'R16', home: { kind: 'matchWinner', match: 85 }, away: { kind: 'matchWinner', match: 87 } },
  // Quarterfinals
  { number: 97, stage: 'QF', home: { kind: 'matchWinner', match: 89 }, away: { kind: 'matchWinner', match: 90 } },
  { number: 98, stage: 'QF', home: { kind: 'matchWinner', match: 93 }, away: { kind: 'matchWinner', match: 94 } },
  { number: 99, stage: 'QF', home: { kind: 'matchWinner', match: 91 }, away: { kind: 'matchWinner', match: 92 } },
  { number: 100, stage: 'QF', home: { kind: 'matchWinner', match: 95 }, away: { kind: 'matchWinner', match: 96 } },
  // Semifinals
  { number: 101, stage: 'SF', home: { kind: 'matchWinner', match: 97 }, away: { kind: 'matchWinner', match: 98 } },
  { number: 102, stage: 'SF', home: { kind: 'matchWinner', match: 99 }, away: { kind: 'matchWinner', match: 100 } },
  // Third place + Final
  { number: 103, stage: 'THIRD', home: { kind: 'matchLoser', match: 101 }, away: { kind: 'matchLoser', match: 102 } },
  { number: 104, stage: 'FINAL', home: { kind: 'matchWinner', match: 101 }, away: { kind: 'matchWinner', match: 102 } },
]

export const KO_BY_NUMBER: Record<number, KoMatch> = Object.fromEntries(KO_MATCHES.map((m) => [m.number, m]))

/** Bracket halves by winner-group pathway — feeds the top-4 seed separation constraint. */
export const HALF1_GROUPS: ReadonlySet<GroupId> = new Set(['D', 'E', 'F', 'G', 'H', 'I', 'K'])
export const HALF2_GROUPS: ReadonlySet<GroupId> = new Set(['A', 'B', 'C', 'J', 'L'])

export function halfOfGroup(g: GroupId): 1 | 2 {
  return HALF1_GROUPS.has(g) ? 1 : 2
}

/** The 8 R32 matches hosting a third-placed team, ascending. */
export const THIRD_SLOT_MATCHES = [74, 77, 79, 80, 81, 82, 83, 85] as const
