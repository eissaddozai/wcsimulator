import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PRESET_GROUPS, PRESET_POTS } from '../data/preset2026'
import { groupsFromTrace, runDraw, validatePots } from '../engine/draw'
import { completeQualification } from '../engine/qualification'
import { mintSeed, stream } from '../engine/rng'
import { GROUP_FIXTURES, GROUP_IDS, POT_TO_POSITION } from '../engine/schedule'
import { seedPots } from '../engine/seeding'
import { quotaStatus } from '../engine/selection'
import { simulateMatch } from '../engine/simulate'
import { allGroupsComplete, bracketState, type Groups } from '../engine/tournament'
import type { ChaosKnobs, DrawPick, MatchResult, Pots, StrategyId } from '../engine/types'

export type Step = 'landing' | 'teams' | 'pots' | 'draw' | 'groups' | 'knockout'
export const STEP_ORDER: Step[] = ['landing', 'teams', 'pots', 'draw', 'groups', 'knockout']

interface TournamentState {
  step: Step
  theme: 'dark' | 'light'
  masterSeed: string
  chaos: ChaosKnobs
  strategy: StrategyId
  entries: string[]
  pots: Pots | null
  drawTrace: DrawPick[] | null
  results: Record<number, MatchResult>
  playoffLog: string[]
  /** bumps every time the draw re-runs so the draw screen restarts its reveal */
  drawRunId: number

  setStep: (s: Step) => void
  setTheme: (t: 'dark' | 'light') => void
  setSeed: (s: string) => void
  setChaos: (k: keyof ChaosKnobs, v: number) => void
  setStrategy: (s: StrategyId) => void

  toggleTeam: (id: string) => void
  clearTeams: () => void
  simulateQualificationAction: () => void

  reseedPots: () => void
  setPots: (p: Pots) => void

  runDrawAction: () => void
  clearFrom: (phase: 'teams' | 'pots' | 'draw' | 'groups') => void

  setResult: (n: number, r: MatchResult | null) => void
  simulateGroupMatch: (n: number) => void
  simulateRemainingGroups: () => void
  simulateKoMatch: (n: number) => void

  loadPreset: () => void
  fullChaos: () => void
  reset: () => void
}

function presetTrace(): DrawPick[] {
  const potOf = new Map<string, 1 | 2 | 3 | 4>()
  PRESET_POTS.forEach((p, i) => p.forEach((id) => potOf.set(id, (i + 1) as 1 | 2 | 3 | 4)))
  const picks: DrawPick[] = []
  for (let pot = 1; pot <= 4; pot++) {
    for (const g of GROUP_IDS) {
      const teamId = PRESET_GROUPS[g][POT_TO_POSITION[pot as 1 | 2 | 3 | 4] - 1]!
      picks.push({
        order: picks.length,
        teamId,
        pot: pot as 1 | 2 | 3 | 4,
        group: g,
        position: POT_TO_POSITION[pot as 1 | 2 | 3 | 4],
        forced: false,
        skipped: [],
      })
    }
  }
  return picks
}

export const groupsOf = (trace: DrawPick[] | null): Groups | null => (trace ? groupsFromTrace(trace) : null)

export const useStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      step: 'landing',
      theme: 'dark',
      masterSeed: mintSeed(),
      chaos: { qualification: 1, seeding: 1, match: 1 },
      strategy: 'official',
      entries: ['MEX', 'CAN', 'USA'],
      pots: null,
      drawTrace: null,
      results: {},
      playoffLog: [],
      drawRunId: 0,

      setStep: (s) => set({ step: s }),
      setTheme: (t) => set({ theme: t }),
      setSeed: (s) => set({ masterSeed: s.trim() || mintSeed() }),
      setChaos: (k, v) => set((st) => ({ chaos: { ...st.chaos, [k]: v } })),
      setStrategy: (s) => set({ strategy: s }),

      toggleTeam: (id) => {
        const { entries } = get()
        if (['MEX', 'CAN', 'USA'].includes(id)) return // hosts locked
        set({
          entries: entries.includes(id) ? entries.filter((e) => e !== id) : [...entries, id],
          pots: null,
          drawTrace: null,
          results: {},
        })
      },
      clearTeams: () =>
        set({ entries: ['MEX', 'CAN', 'USA'], pots: null, drawTrace: null, results: {}, playoffLog: [] }),

      simulateQualificationAction: () => {
        const { entries, chaos, masterSeed } = get()
        // fresh sub-seed per click so re-runs differ, but recorded via the log seedstring
        const subSeed = `${masterSeed} qual:${Date.now() % 100000}`
        const { entries: full, playoffLog } = completeQualification(entries, chaos.qualification, stream(subSeed, 'qual'))
        set({ entries: full, playoffLog, pots: null, drawTrace: null, results: {} })
      },

      reseedPots: () => {
        const { entries, strategy, chaos, masterSeed } = get()
        if (entries.length !== 48) return
        const subSeed = `${masterSeed} seed:${Date.now() % 100000}`
        set({ pots: seedPots(entries, strategy, chaos.seeding, stream(subSeed, 'seed')), drawTrace: null, results: {} })
      },
      setPots: (p) => set({ pots: p, drawTrace: null, results: {} }),

      runDrawAction: () => {
        const { pots, masterSeed, drawRunId } = get()
        if (!pots || !validatePots(pots).ok) return
        const subSeed = `${masterSeed} draw:${drawRunId}`
        set({ drawTrace: runDraw(pots, stream(subSeed, 'draw')), results: {}, drawRunId: drawRunId + 1 })
      },

      clearFrom: (phase) => {
        if (phase === 'teams') get().clearTeams()
        else if (phase === 'pots') set({ pots: null, drawTrace: null, results: {} })
        else if (phase === 'draw') set({ drawTrace: null, results: {} })
        else set({ results: {} })
      },

      setResult: (n, r) => {
        set((st) => {
          const results = { ...st.results }
          if (r === null) delete results[n]
          else results[n] = r
          return { results }
        })
      },

      simulateGroupMatch: (n) => {
        const { drawTrace, masterSeed, chaos } = get()
        const groups = groupsOf(drawTrace)
        if (!groups) return
        const f = GROUP_FIXTURES.find((x) => x.number === n)
        if (!f) return
        const home = groups[f.group][f.homePos - 1]
        const away = groups[f.group][f.awayPos - 1]
        if (!home || !away) return
        const r = simulateMatch(home, away, false, chaos.match, stream(masterSeed, `match:${n}:${Date.now() % 100000}`))
        get().setResult(n, r)
      },

      simulateRemainingGroups: () => {
        const { drawTrace, masterSeed, chaos, results } = get()
        const groups = groupsOf(drawTrace)
        if (!groups) return
        const next = { ...results }
        for (const f of GROUP_FIXTURES) {
          if (next[f.number]) continue
          const home = groups[f.group][f.homePos - 1]
          const away = groups[f.group][f.awayPos - 1]
          if (!home || !away) continue
          next[f.number] = simulateMatch(home, away, false, chaos.match, stream(masterSeed, `match:${f.number}`))
        }
        set({ results: next })
      },

      simulateKoMatch: (n) => {
        const { drawTrace, masterSeed, chaos, results } = get()
        const groups = groupsOf(drawTrace)
        if (!groups) return
        const { bracket } = bracketState(groups, results, masterSeed)
        const m = bracket[n]
        if (!m?.home || !m.away) return
        const r = simulateMatch(m.home, m.away, true, chaos.match, stream(masterSeed, `match:${n}:${Date.now() % 100000}`))
        r.enteredFor = [m.home, m.away]
        get().setResult(n, r)
      },

      loadPreset: () => {
        set({
          entries: [...PRESET_POTS.flat()],
          pots: PRESET_POTS.map((p) => p.slice()),
          drawTrace: presetTrace(),
          results: {},
          playoffLog: [],
          step: 'groups',
        })
      },

      fullChaos: () => {
        const masterSeed = mintSeed()
        const chaos: ChaosKnobs = { qualification: 1, seeding: 1, match: 1 }
        const { entries } = completeQualification([], chaos.qualification, stream(masterSeed, 'qual'))
        const pots = seedPots(entries, 'noisy', chaos.seeding, stream(masterSeed, 'seed'))
        const trace = runDraw(pots, stream(masterSeed, 'draw'))
        const groups = groupsFromTrace(trace)
        const results: Record<number, MatchResult> = {}
        for (const f of GROUP_FIXTURES) {
          const home = groups[f.group][f.homePos - 1]!
          const away = groups[f.group][f.awayPos - 1]!
          results[f.number] = simulateMatch(home, away, false, chaos.match, stream(masterSeed, `match:${f.number}`))
        }
        for (let n = 73; n <= 104; n++) {
          const { bracket } = bracketState(groups, results, masterSeed)
          const m = bracket[n]!
          const r = simulateMatch(m.home!, m.away!, true, chaos.match, stream(masterSeed, `match:${n}`))
          r.enteredFor = [m.home!, m.away!]
          results[n] = r
        }
        set({
          masterSeed,
          chaos,
          strategy: 'noisy',
          entries,
          pots,
          drawTrace: trace,
          results,
          playoffLog: [],
          step: 'knockout',
          drawRunId: get().drawRunId + 1,
        })
      },

      reset: () =>
        set({
          step: 'landing',
          masterSeed: mintSeed(),
          entries: ['MEX', 'CAN', 'USA'],
          pots: null,
          drawTrace: null,
          results: {},
          playoffLog: [],
          strategy: 'official',
        }),
    }),
    {
      name: 'wcsim:tournament',
      version: 1,
      partialize: (s) => ({
        step: s.step,
        theme: s.theme,
        masterSeed: s.masterSeed,
        chaos: s.chaos,
        strategy: s.strategy,
        entries: s.entries,
        pots: s.pots,
        drawTrace: s.drawTrace,
        results: s.results,
        playoffLog: s.playoffLog,
        drawRunId: s.drawRunId,
      }),
    },
  ),
)

/** Which steps are reachable for editing right now (viewing is always allowed). */
export function stepGates(s: Pick<TournamentState, 'entries' | 'pots' | 'drawTrace' | 'results'>) {
  const quota = quotaStatus(s.entries)
  const potsOk = s.pots !== null && validatePots(s.pots).ok
  return {
    teams: true,
    pots: quota.complete,
    draw: quota.complete && potsOk,
    groups: s.drawTrace !== null,
    knockout: s.drawTrace !== null && allGroupsComplete(s.results),
  }
}
