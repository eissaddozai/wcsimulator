import type { GroupId48, Pots } from '../engine/types'

/**
 * The real FIFA World Cup 26: qualified 48, final-draw pots (5 Dec 2025, playoff
 * placeholders resolved to their March-2026 winners), and the actual draw result.
 */
export const PRESET_POTS: Pots = [
  ['MEX', 'CAN', 'USA', 'ESP', 'ARG', 'FRA', 'ENG', 'BRA', 'POR', 'NED', 'BEL', 'GER'],
  ['CRO', 'MAR', 'COL', 'URU', 'SUI', 'JPN', 'SEN', 'IRN', 'KOR', 'ECU', 'AUT', 'AUS'],
  ['NOR', 'PAN', 'EGY', 'ALG', 'SCO', 'PAR', 'TUN', 'CIV', 'UZB', 'QAT', 'KSA', 'RSA'],
  ['JOR', 'CPV', 'GHA', 'CUW', 'HAI', 'NZL', 'CZE', 'BIH', 'TUR', 'SWE', 'IRQ', 'COD'],
]

export const PRESET_ENTRIES: string[] = PRESET_POTS.flat()

/** Real draw result — teams listed in position order 1..4. */
export const PRESET_GROUPS: Record<GroupId48, [string, string, string, string]> = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'QAT', 'SUI', 'BIH'],
  C: ['BRA', 'SCO', 'MAR', 'HAI'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CIV', 'ECU', 'CUW'],
  F: ['NED', 'TUN', 'JPN', 'SWE'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'KSA', 'URU', 'CPV'],
  I: ['FRA', 'NOR', 'SEN', 'IRQ'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'UZB', 'COL', 'COD'],
  L: ['ENG', 'PAN', 'CRO', 'GHA'],
}
