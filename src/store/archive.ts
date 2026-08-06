import { setNationOverrides, type NationOverride } from '../data/nations'
import { groupsFromTrace } from '../engine/draw'
import type { QualMode } from '../engine/qualification'
import { finalNumberFor } from '../engine/schedule'
import { setModelParams, type ModelParams } from '../engine/simulate'
import { bracketState } from '../engine/tournament'
import { useStore, type PlayoffKey, type Step } from './store'
import type { ChaosKnobs, DrawPick, Format, MatchResult, Pots, StrategyId } from '../engine/types'

/**
 * The tournament archive: name a run, shelve it locally, restore it any time.
 * Lives in its own localStorage key so the live tournament stays lean.
 */
const KEY = 'wcsim:archive'
const LIMIT = 24

export interface RunSnapshot {
  step: Step
  /** absent on runs saved before the 64-team era — treated as 48 */
  format?: Format
  qualMode?: QualMode
  masterSeed: string
  chaos: ChaosKnobs
  strategy: StrategyId
  hosts: string[]
  hostsChosen: boolean
  entries: string[]
  playoffTeams: string[]
  playoffResults: Partial<Record<PlayoffKey, MatchResult>>
  pots: Pots | null
  drawTrace: DrawPick[] | null
  results: Record<number, MatchResult>
  playoffLog: string[]
  drawRunId: number
  ratingOverrides: Record<string, NationOverride>
  modelParams: Partial<ModelParams>
}

export interface SavedRun {
  id: string
  name: string
  savedAt: number
  champion: string | null
  snapshot: RunSnapshot
}

export function listRuns(): SavedRun[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as SavedRun[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(runs: SavedRun[]): void {
  localStorage.setItem(KEY, JSON.stringify(runs.slice(0, LIMIT)))
}

/** Champion of the current state, if the final has been decided. */
export function currentChampion(): string | null {
  const s = useStore.getState()
  if (!s.drawTrace) return null
  try {
    const groups = groupsFromTrace(s.drawTrace, s.format)
    return bracketState(groups, s.results, s.masterSeed, s.format).bracket[finalNumberFor(s.format)]?.winner ?? null
  } catch {
    return null
  }
}

export function saveRun(name: string): SavedRun {
  const s = useStore.getState()
  const snapshot: RunSnapshot = {
    step: s.step,
    format: s.format,
    qualMode: s.qualMode,
    masterSeed: s.masterSeed,
    chaos: s.chaos,
    strategy: s.strategy,
    hosts: s.hosts,
    hostsChosen: s.hostsChosen,
    entries: s.entries,
    playoffTeams: s.playoffTeams,
    playoffResults: s.playoffResults,
    pots: s.pots,
    drawTrace: s.drawTrace,
    results: s.results,
    playoffLog: s.playoffLog,
    drawRunId: s.drawRunId,
    ratingOverrides: s.ratingOverrides,
    modelParams: s.modelParams,
  }
  const run: SavedRun = {
    id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'Untitled run',
    savedAt: Date.now(),
    champion: currentChampion(),
    snapshot,
  }
  write([run, ...listRuns()])
  return run
}

export function deleteRun(id: string): void {
  write(listRuns().filter((r) => r.id !== id))
}

export function loadRun(id: string): boolean {
  const run = listRuns().find((r) => r.id === id)
  if (!run) return false
  const snap = run.snapshot
  useStore.setState({ ...snap, format: snap.format ?? 48, qualMode: snap.qualMode ?? 'balanced' })
  // mirror the persisted registries exactly as rehydration does
  setNationOverrides(snap.ratingOverrides ?? {})
  setModelParams(snap.modelParams ?? {})
  return true
}
