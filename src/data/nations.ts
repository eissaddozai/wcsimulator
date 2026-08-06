import type { Confed, Nation } from '../engine/types'
import raw from './nations.json'

export const NATIONS: Nation[] = raw as Nation[]

export const NATION_BY_ID: ReadonlyMap<string, Nation> = new Map(NATIONS.map((n) => [n.id, n]))

export function nation(id: string): Nation {
  const n = NATION_BY_ID.get(id)
  if (!n) throw new Error(`Unknown nation: ${id}`)
  return n
}

/** The real 2026 trio — the default host selection, no longer hard-wired anywhere. */
export const DEFAULT_HOSTS: string[] = ['MEX', 'CAN', 'USA']

export const CONFEDS: Confed[] = ['UEFA', 'CAF', 'AFC', 'CONCACAF', 'CONMEBOL', 'OFC']

/** Base slot quotas; 2 flexible inter-confederation playoff slots on top (UEFA excluded). */
export const BASE_QUOTA: Record<Confed, number> = {
  UEFA: 16,
  CAF: 9,
  AFC: 8,
  CONCACAF: 6,
  CONMEBOL: 6,
  OFC: 1,
}
export const FLEX_SLOTS = 2

export function byConfed(confed: Confed): Nation[] {
  return NATIONS.filter((n) => n.confed === confed).sort((a, b) => a.rank - b.rank)
}

/** Runtime overrides from the in-app ratings editor — consulted by every engine read. */
export interface NationOverride {
  rank?: number
  rating?: number
  boosts?: string[] // booster ids from engine/boosters.ts
}
const OVERRIDES = new Map<string, NationOverride>()

export function setNationOverrides(o: Record<string, NationOverride>): void {
  OVERRIDES.clear()
  for (const [id, v] of Object.entries(o)) OVERRIDES.set(id, v)
}

export function overrideOf(id: string): NationOverride | undefined {
  return OVERRIDES.get(id)
}

export function rankOf(id: string): number {
  return OVERRIDES.get(id)?.rank ?? nation(id).rank
}

/** Compact display names for tight tables; everything else uses the full name. */
const SHORT_NAMES: Record<string, string> = {
  USA: 'USA',
  BIH: 'Bosnia',
  KOR: 'Korea Rep.',
  PRK: 'Korea DPR',
  RSA: 'S. Africa',
  NZL: 'N. Zealand',
  KSA: 'Saudi Arabia',
  NCL: 'N. Caledonia',
  NIR: 'N. Ireland',
  MKD: 'N. Macedonia',
  DOM: 'Dominican Rep.',
  TRI: 'Trinidad',
  ATG: 'Antigua',
  VIN: 'St. Vincent',
  SKN: 'St. Kitts',
  TCA: 'Turks & Caicos',
  VGB: 'BVI',
  VIR: 'USVI',
  CTA: 'Cent. Africa',
  EQG: 'Eq. Guinea',
  PNG: 'Papua NG',
  STP: 'São Tomé',
  SOL: 'Solomons',
  ASA: 'Am. Samoa',
  UAE: 'UAE',
  FRO: 'Faroes',
  CAY: 'Caymans',
  GNB: 'G.-Bissau',
  TPE: 'Ch. Taipei',
}

export function shortName(id: string): string {
  return SHORT_NAMES[id] ?? NATION_BY_ID.get(id)?.name ?? id
}

export function ratingOf(id: string): number {
  return OVERRIDES.get(id)?.rating ?? nation(id).rating
}
