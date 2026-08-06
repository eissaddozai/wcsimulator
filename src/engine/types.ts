export type Confed = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'

export interface Nation {
  id: string // FIFA trigraph, e.g. 'BRA', 'ENG', 'KVX'
  name: string
  flag: string // explicit flag asset code, e.g. 'br', 'gb-eng', 'xk' — never derived
  confed: Confed
  rank: number // FIFA world ranking position
  rating: number // blended Elo-like strength R
  form: number // 12-month rating delta, used by the Form seeding strategy
  host?: boolean
}

export type GroupId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'
export type PotNumber = 1 | 2 | 3 | 4
export type Position = 1 | 2 | 3 | 4

/** 4 pots × 12 nation ids */
export type Pots = string[][]

export interface DrawPick {
  order: number
  teamId: string
  pot: PotNumber
  group: GroupId
  position: Position
  /** true when constraints left a single legal group (or the team is a pre-placed host) */
  forced: boolean
  /** groups skipped by constraints before this placement, with reasons (for the reveal UI) */
  skipped: { group: GroupId; reason: string }[]
}

export interface ScorePair {
  home: number | null // null = not yet entered — one side can be typed without zeroing the other
  away: number | null
}

/** A result only counts once both sides of the 90' score are entered. */
export function isScored(r: MatchResult): boolean {
  return r.score.home !== null && r.score.away !== null
}

/** User input for one match, keyed by match number in the tournament results record. */
export interface MatchResult {
  score: ScorePair
  et?: ScorePair // extra-time goals only (added on top of 90' score)
  pens?: ScorePair
  simulated?: boolean
  /** participant snapshot when the score was entered — knockout invalidation (stale detection) */
  enteredFor?: [string, string]
}

export interface GroupFixture {
  number: number // 1..72
  group: GroupId
  matchday: 1 | 2 | 3
  homePos: Position
  awayPos: Position
}

export type KoSource =
  | { kind: 'winner'; group: GroupId }
  | { kind: 'runnerUp'; group: GroupId }
  | { kind: 'third'; cands: GroupId[] }
  | { kind: 'matchWinner'; match: number }
  | { kind: 'matchLoser'; match: number }

export type KoStage = 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD' | 'FINAL'

export interface KoMatch {
  number: number // 73..104
  stage: KoStage
  home: KoSource
  away: KoSource
}

export type TieBreakRung = 'points' | 'h2h' | 'gd' | 'gf' | 'rank' | 'lots'

export interface StandingRow {
  id: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  position: Position
  /** which tiebreaker rung placed this team relative to its points-tied peers */
  decidedBy: TieBreakRung | null
}

export interface ThirdRank {
  id: string
  group: GroupId
  rank: number // 1..12
  qualified: boolean // top 8
  provisional: boolean
  row: StandingRow
}

export type StrategyId = 'official' | 'noisy' | 'pl-draft' | 'form' | 'chaos'

export interface ChaosKnobs {
  qualification: number // θ ∈ [0,2]
  seeding: number
  match: number
}
