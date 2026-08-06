import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_HOSTS, NATIONS, setNationOverrides, type NationOverride } from '../data/nations'
import { PRESET_GROUPS, PRESET_POTS } from '../data/preset2026'
import { groupsFromTrace, runDraw, validatePots } from '../engine/draw'
import { completeQualification } from '../engine/qualification'
import { makeRng, mintSeed, stream } from '../engine/rng'
import { GROUP_FIXTURES, KO_BY_NUMBER, GROUP_IDS, POT_TO_POSITION } from '../engine/schedule'
import { seedPots } from '../engine/seeding'
import { quotaStatus } from '../engine/selection'
import { matchEnvironment } from '../engine/environment'
import { setModelParams, simulateMatch, stageOfMatch, type MatchContext, type ModelParams } from '../engine/simulate'
import { allGroupsComplete, bracketState, type Groups } from '../engine/tournament'
import type { BracketState } from '../engine/bracket'
import type { ChaosKnobs, DrawPick, GroupId, MatchResult, Position, Pots, StrategyId } from '../engine/types'
import { fixturesOfGroup } from '../engine/schedule'

export type Step = 'landing' | 'lab' | 'teams' | 'pots' | 'draw' | 'groups' | 'knockout'
export const STEP_ORDER: Step[] = ['landing', 'lab', 'teams', 'pots', 'draw', 'groups', 'knockout']

interface TournamentState {
  step: Step
  theme: 'dark' | 'light'
  masterSeed: string
  chaos: ChaosKnobs
  strategy: StrategyId
  hosts: string[]
  hostsChosen: boolean
  entries: string[]
  pots: Pots | null
  drawTrace: DrawPick[] | null
  results: Record<number, MatchResult>
  playoffLog: string[]
  drawRunId: number
  /** ratings-editor + booster assignments, mirrored into the nations registry */
  ratingOverrides: Record<string, NationOverride>
  /** Model Lab sliders, mirrored into the simulation engine */
  modelParams: Partial<ModelParams>

  setStep: (s: Step) => void
  setTheme: (t: 'dark' | 'light') => void
  setSeed: (s: string) => void
  setChaos: (k: keyof ChaosKnobs, v: number) => void
  setStrategy: (s: StrategyId) => void

  setHosts: (hosts: string[]) => void
  surpriseHosts: () => void
  markHostsChosen: () => void

  toggleTeam: (id: string) => void
  clearTeams: () => void
  simulateQualificationAction: () => void

  reseedPots: () => void
  setPots: (p: Pots) => void

  runDrawAction: () => void

  setResult: (n: number, r: MatchResult | null) => void
  simulateGroupMatch: (n: number) => void
  simulateRemainingGroups: () => void
  simulateKoMatch: (n: number) => void

  setNationOverride: (id: string, o: NationOverride | null) => void
  clearAllOverrides: () => void
  setModelParam: (k: keyof ModelParams, v: number) => void
  applyModelPreset: (p: Partial<ModelParams>) => void
  resetModelParams: () => void
  swapGroupSlots: (a: { group: GroupId; position: Position }, b: { group: GroupId; position: Position }) => void

  loadPreset: () => void
  fullChaos: () => void
  reset: () => void
}

function presetTrace(): DrawPick[] {
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

/** Context for simulating match n: stage, hosts, fatigue, weather, and the referee. */
export function contextFor(
  n: number,
  home: string,
  away: string,
  hosts: readonly string[],
  bracket: BracketState | null,
  masterSeed?: string,
): MatchContext {
  const stage = stageOfMatch(n)
  const ctx: MatchContext = {
    stage,
    homeHost: hosts.includes(home),
    awayHost: hosts.includes(away),
  }
  if (stage !== 'group' && stage !== 'r32' && bracket) {
    ctx.homeFreshness = freshness(n, home, bracket)
    ctx.awayFreshness = freshness(n, away, bracket)
  }
  if (masterSeed) {
    const env = matchEnvironment(masterSeed, n)
    ctx.weather = env.weather
    ctx.refStrictness = env.refStrictness
  }
  return ctx
}

/** 1 = fresh; 0.9 if the team's previous knockout went to extra time; 0.85 after pens. */
function freshness(n: number, teamId: string, bracket: BracketState): number {
  const ko = KO_BY_NUMBER[n]
  if (!ko) return 1
  for (const src of [ko.home, ko.away]) {
    if (src.kind !== 'matchWinner' && src.kind !== 'matchLoser') continue
    const feeder = bracket[src.match]
    if (!feeder || (feeder.winner !== teamId && feeder.loser !== teamId)) continue
    const r = feeder.result
    if (!r || feeder.stale) return 1
    if (r.pens) return 0.85
    if (r.et) return 0.9
    return 1
  }
  return 1
}

/** Weighted host lottery: 1–3 hosts, plausibility-weighted by rating, for "surprise me". */
export function drawSurpriseHosts(seed?: string): string[] {
  const rng = makeRng(seed ?? `hosts:${mintSeed()}`)
  const count = rng() < 0.5 ? 1 : rng() < 0.7 ? 2 : 3
  const pool = NATIONS.filter((n) => n.rating >= 1450) // nations that could stage it
  const picked: string[] = []
  while (picked.length < count && pool.length > 0) {
    const weights = pool.map((n) => (picked.includes(n.id) ? 0 : Math.pow((n.rating - 1300) / 100, 2)))
    const total = weights.reduce((s, w) => s + w, 0)
    let r = rng() * total
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i]!
      if (r <= 0) {
        if (!picked.includes(pool[i]!.id)) picked.push(pool[i]!.id)
        break
      }
    }
  }
  return picked.length > 0 ? picked : ['BRA']
}

export const useStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      step: 'landing',
      theme: 'dark',
      masterSeed: mintSeed(),
      chaos: { qualification: 1, seeding: 1, match: 1 },
      strategy: 'official',
      hosts: [...DEFAULT_HOSTS],
      hostsChosen: false,
      entries: [...DEFAULT_HOSTS],
      pots: null,
      drawTrace: null,
      results: {},
      playoffLog: [],
      drawRunId: 0,
      ratingOverrides: {},
      modelParams: {},

      setStep: (s) => set({ step: s }),
      setTheme: (t) => set({ theme: t }),
      setSeed: (s) => set({ masterSeed: s.trim() || mintSeed() }),
      setChaos: (k, v) => set((st) => ({ chaos: { ...st.chaos, [k]: v } })),
      setStrategy: (s) => set({ strategy: s }),

      setHosts: (hosts) => {
        const clean = [...new Set(hosts)].slice(0, 3)
        if (clean.length === 0) return
        const keep = get().entries.filter((id) => !get().hosts.includes(id) && !clean.includes(id))
        set({
          hosts: clean,
          hostsChosen: true,
          entries: [...clean, ...keep].slice(0, 48),
          pots: null,
          drawTrace: null,
          results: {},
          playoffLog: [],
        })
      },
      surpriseHosts: () => {
        get().setHosts(drawSurpriseHosts())
      },
      markHostsChosen: () => set({ hostsChosen: true }),

      toggleTeam: (id) => {
        const { entries, hosts } = get()
        if (hosts.includes(id)) return // hosts locked
        set({
          entries: entries.includes(id) ? entries.filter((e) => e !== id) : [...entries, id],
          pots: null,
          drawTrace: null,
          results: {},
        })
      },
      clearTeams: () =>
        set((st) => ({ entries: [...st.hosts], pots: null, drawTrace: null, results: {}, playoffLog: [] })),

      simulateQualificationAction: () => {
        const { entries, hosts, chaos, masterSeed } = get()
        const subSeed = `${masterSeed} qual:${Date.now() % 100000}`
        const { entries: full, playoffLog } = completeQualification(
          entries,
          hosts,
          chaos.qualification,
          stream(subSeed, 'qual'),
        )
        set({ entries: full, playoffLog, pots: null, drawTrace: null, results: {} })
      },

      reseedPots: () => {
        const { entries, hosts, strategy, chaos, masterSeed } = get()
        if (entries.length !== 48) return
        const subSeed = `${masterSeed} seed:${Date.now() % 100000}`
        set({
          pots: seedPots(entries, hosts, strategy, chaos.seeding, stream(subSeed, 'seed')),
          drawTrace: null,
          results: {},
        })
      },
      setPots: (p) => set({ pots: p, drawTrace: null, results: {} }),

      runDrawAction: () => {
        const { pots, hosts, masterSeed, drawRunId } = get()
        if (!pots || !validatePots(pots, hosts).ok) return
        const subSeed = `${masterSeed} draw:${drawRunId}`
        set({ drawTrace: runDraw(pots, hosts, stream(subSeed, 'draw')), results: {}, drawRunId: drawRunId + 1 })
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
        const { drawTrace, masterSeed, chaos, hosts } = get()
        const groups = groupsOf(drawTrace)
        if (!groups) return
        const f = GROUP_FIXTURES.find((x) => x.number === n)
        if (!f) return
        const home = groups[f.group][f.homePos - 1]
        const away = groups[f.group][f.awayPos - 1]
        if (!home || !away) return
        const ctx = contextFor(n, home, away, hosts, null, masterSeed)
        const r = simulateMatch(home, away, ctx, chaos.match, stream(masterSeed, `match:${n}:${Date.now() % 100000}`))
        get().setResult(n, r)
      },

      simulateRemainingGroups: () => {
        const { drawTrace, masterSeed, chaos, results, hosts } = get()
        const groups = groupsOf(drawTrace)
        if (!groups) return
        const next = { ...results }
        for (const f of GROUP_FIXTURES) {
          if (next[f.number]) continue
          const home = groups[f.group][f.homePos - 1]
          const away = groups[f.group][f.awayPos - 1]
          if (!home || !away) continue
          const ctx = contextFor(f.number, home, away, hosts, null, masterSeed)
          next[f.number] = simulateMatch(home, away, ctx, chaos.match, stream(masterSeed, `match:${f.number}`))
        }
        set({ results: next })
      },

      simulateKoMatch: (n) => {
        const { drawTrace, masterSeed, chaos, results, hosts } = get()
        const groups = groupsOf(drawTrace)
        if (!groups) return
        const { bracket } = bracketState(groups, results, masterSeed)
        const m = bracket[n]
        if (!m?.home || !m.away) return
        const ctx = contextFor(n, m.home, m.away, hosts, bracket, masterSeed)
        const r = simulateMatch(m.home, m.away, ctx, chaos.match, stream(masterSeed, `match:${n}:${Date.now() % 100000}`))
        r.enteredFor = [m.home, m.away]
        get().setResult(n, r)
      },

      setNationOverride: (id, o) => {
        const next = { ...get().ratingOverrides }
        if (o === null || (o.rank === undefined && o.rating === undefined && (!o.boosts || o.boosts.length === 0))) {
          delete next[id]
        } else {
          next[id] = o
        }
        setNationOverrides(next)
        set({ ratingOverrides: next })
      },
      clearAllOverrides: () => {
        setNationOverrides({})
        set({ ratingOverrides: {} })
      },
      setModelParam: (k, v) => {
        const next = { ...get().modelParams, [k]: v }
        setModelParams(next)
        set({ modelParams: next })
      },
      applyModelPreset: (p) => {
        setModelParams(p)
        set({ modelParams: { ...p } })
      },
      resetModelParams: () => {
        setModelParams({})
        set({ modelParams: {} })
      },

      swapGroupSlots: (a, b) => {
        const trace = get().drawTrace
        if (!trace) return
        const pa = trace.find((p) => p.group === a.group && p.position === a.position)
        const pb = trace.find((p) => p.group === b.group && p.position === b.position)
        if (!pa || !pb) return
        const next = trace.map((p) => {
          if (p === pa) return { ...p, group: b.group, position: b.position }
          if (p === pb) return { ...p, group: a.group, position: a.position }
          return p
        })
        // scores in the affected groups referred to the old pairings — set them aside
        const results = { ...get().results }
        for (const g of new Set([a.group, b.group])) {
          for (const f of fixturesOfGroup(g)) delete results[f.number]
        }
        set({ drawTrace: next, results })
      },

      loadPreset: () => {
        set({
          hosts: [...DEFAULT_HOSTS],
          hostsChosen: true,
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
        const hosts = drawSurpriseHosts(`${masterSeed} hosts`) // the simulator decides who's hosting
        const { entries } = completeQualification([], hosts, chaos.qualification, stream(masterSeed, 'qual'))
        const pots = seedPots(entries, hosts, 'noisy', chaos.seeding, stream(masterSeed, 'seed'))
        const trace = runDraw(pots, hosts, stream(masterSeed, 'draw'))
        const groups = groupsFromTrace(trace)
        const results: Record<number, MatchResult> = {}
        for (const f of GROUP_FIXTURES) {
          const home = groups[f.group][f.homePos - 1]!
          const away = groups[f.group][f.awayPos - 1]!
          const ctx = contextFor(f.number, home, away, hosts, null, masterSeed)
          results[f.number] = simulateMatch(home, away, ctx, chaos.match, stream(masterSeed, `match:${f.number}`))
        }
        for (let n = 73; n <= 104; n++) {
          const { bracket } = bracketState(groups, results, masterSeed)
          const m = bracket[n]!
          const ctx = contextFor(n, m.home!, m.away!, hosts, bracket)
          const r = simulateMatch(m.home!, m.away!, ctx, chaos.match, stream(masterSeed, `match:${n}`))
          r.enteredFor = [m.home!, m.away!]
          results[n] = r
        }
        set({
          masterSeed,
          chaos,
          strategy: 'noisy',
          hosts,
          hostsChosen: true,
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
          hosts: [...DEFAULT_HOSTS],
          hostsChosen: false,
          entries: [...DEFAULT_HOSTS],
          pots: null,
          drawTrace: null,
          results: {},
          playoffLog: [],
          strategy: 'official',
        }),
    }),
    {
      name: 'wcsim:tournament',
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as Record<string, unknown>
        if (version < 2) {
          s.hosts = [...DEFAULT_HOSTS]
          s.hostsChosen = true // existing saves were built on the 2026 trio
        }
        if (version < 3) s.ratingOverrides = {}
        if (version < 4) s.modelParams = {}
        return s
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          setNationOverrides(state.ratingOverrides ?? {})
          setModelParams(state.modelParams ?? {})
        }
      },
      partialize: (s) => ({
        step: s.step,
        theme: s.theme,
        masterSeed: s.masterSeed,
        chaos: s.chaos,
        strategy: s.strategy,
        hosts: s.hosts,
        hostsChosen: s.hostsChosen,
        entries: s.entries,
        pots: s.pots,
        drawTrace: s.drawTrace,
        results: s.results,
        playoffLog: s.playoffLog,
        drawRunId: s.drawRunId,
        ratingOverrides: s.ratingOverrides,
        modelParams: s.modelParams,
      }),
    },
  ),
)

/** Which steps are reachable for editing right now (viewing is always allowed). */
export function stepGates(s: Pick<TournamentState, 'entries' | 'hosts' | 'pots' | 'drawTrace' | 'results'>) {
  const quota = quotaStatus(s.entries, s.hosts)
  const potsOk = s.pots !== null && validatePots(s.pots, s.hosts).ok
  return {
    teams: true,
    pots: quota.complete,
    draw: quota.complete && potsOk,
    groups: s.drawTrace !== null,
    knockout: s.drawTrace !== null && allGroupsComplete(s.results),
  }
}
