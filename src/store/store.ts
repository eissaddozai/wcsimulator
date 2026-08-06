import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_HOSTS, NATIONS, setNationOverrides, type NationOverride } from '../data/nations'
import { PRESET_GROUPS, PRESET_POTS } from '../data/preset2026'
import { groupsFromTrace, runDraw, validatePots } from '../engine/draw'
import { completeQualification, type QualMode } from '../engine/qualification'
import { makeRng, mintSeed, stream } from '../engine/rng'
import {
  GROUP_IDS,
  POT_TO_POSITION,
  fixturesOfGroupFor,
  groupFixturesFor,
  koByNumberFor,
  koRangeFor,
} from '../engine/schedule'
import { seedPots } from '../engine/seeding'
import { playoffState, playoff64State, type PlayoffMatchKey, type Playoff64Key } from '../engine/playoffs'
import { canAddPlayoff, fieldSizeFor, quotaStatus } from '../engine/selection'
import {
  HOST_SURGE,
  bothSafe,
  formDriftOf,
  isRivalry,
  stakesOf,
  suspensionBurden,
  type CampaignSources,
} from '../engine/campaign'
import { matchEnvironment } from '../engine/environment'
import { setModelParams, simulateMatch, stageOfMatchFor, type MatchContext, type ModelParams } from '../engine/simulate'
import { allGroupsComplete, bracketState, type Groups } from '../engine/tournament'
import type { BracketState } from '../engine/bracket'
import type { ChaosKnobs, DrawPick, Format, GroupId, MatchResult, Position, Pots, StrategyId } from '../engine/types'

export type Step = 'landing' | 'lab' | 'teams' | 'pots' | 'draw' | 'groups' | 'knockout'
export const STEP_ORDER: Step[] = ['landing', 'lab', 'teams', 'pots', 'draw', 'groups', 'knockout']

/** every playable play-off tie across both formats — key spaces are disjoint */
export type PlayoffKey = PlayoffMatchKey | Playoff64Key

interface TournamentState {
  step: Step
  theme: 'dark' | 'light'
  /** app-wide interface zoom (0.7–1.3) */
  uiZoom: number
  /** 48-team World Cup 26, or the expanded 64-team format */
  format: Format
  /** how the qualifying simulator reads the world */
  qualMode: QualMode
  masterSeed: string
  chaos: ChaosKnobs
  strategy: StrategyId
  hosts: string[]
  hostsChosen: boolean
  entries: string[]
  /** Play-off Tournament entrants (manual selection path): 6 in the 48 format, 16 in the 64 */
  playoffTeams: string[]
  /** hand-played Play-off Tournament results */
  playoffResults: Partial<Record<PlayoffKey, MatchResult>>
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
  setUiZoom: (z: number) => void
  setFormat: (f: Format) => void
  setQualMode: (m: QualMode) => void
  setSeed: (s: string) => void
  setChaos: (k: keyof ChaosKnobs, v: number) => void
  setStrategy: (s: StrategyId) => void

  setHosts: (hosts: string[]) => void
  surpriseHosts: () => void
  markHostsChosen: () => void

  toggleTeam: (id: string) => void
  togglePlayoffTeam: (id: string) => void
  setPlayoffResult: (k: PlayoffKey, r: MatchResult | null) => void
  simulatePlayoffMatch: (k: PlayoffKey) => void
  clearTeams: () => void
  simulateQualificationAction: () => void

  reseedPots: () => void
  setPots: (p: Pots) => void

  runDrawAction: () => void

  setResult: (n: number, r: MatchResult | null) => void
  simulateGroupMatch: (n: number) => void
  simulateGroup: (g: GroupId) => void
  simulateRemainingGroups: () => void
  simulateKoMatch: (n: number) => void

  setNationOverride: (id: string, o: NationOverride | null) => void
  clearAllOverrides: () => void
  setModelParam: (k: keyof ModelParams, v: number) => void
  applyModelPreset: (p: Partial<ModelParams>) => void
  clearModelParams: (keys: (keyof ModelParams)[]) => void
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
      const teamId = PRESET_GROUPS[g as import('../engine/types').GroupId48][POT_TO_POSITION[pot as 1 | 2 | 3 | 4] - 1]!
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

export const groupsOf = (trace: DrawPick[] | null, format: Format = 48): Groups | null =>
  trace ? groupsFromTrace(trace, format) : null

/** Context for simulating match n: stage, hosts, fatigue, weather — and the campaign systems. */
export function contextFor(
  n: number,
  home: string,
  away: string,
  hosts: readonly string[],
  bracket: BracketState | null,
  masterSeed?: string,
  format: Format = 48,
  enrich?: { groups: Groups; results: Record<number, MatchResult> },
): MatchContext {
  const stage = stageOfMatchFor(n, format)
  const ctx: MatchContext = {
    stage,
    homeHost: hosts.includes(home),
    awayHost: hosts.includes(away),
  }
  if (stage !== 'group' && bracket) {
    const fh = deepFreshness(n, home, bracket, format)
    const fa = deepFreshness(n, away, bracket, format)
    if (fh.freshness < 1) ctx.homeFreshness = fh.freshness
    if (fa.freshness < 1) ctx.awayFreshness = fa.freshness
    // the comeback carries: climbing off the canvas banks belief for the next round
    if (fh.comebackCarry) ctx.formHome = (ctx.formHome ?? 0) + 15
    if (fa.comebackCarry) ctx.formAway = (ctx.formAway ?? 0) + 15
  }
  if (masterSeed) {
    const env = matchEnvironment(masterSeed, n, stage !== 'group')
    ctx.weather = env.weather
    ctx.refStrictness = env.refStrictness
  }
  // campaign systems: rivalry, live form, suspensions, stakes, the host surge
  ctx.rivalry = isRivalry(home, away)
  ctx.hostSurge = HOST_SURGE[stage] ?? 1
  if (enrich) {
    const src: CampaignSources = { groups: enrich.groups, results: enrich.results, bracket, format }
    ctx.formHome = (ctx.formHome ?? 0) + formDriftOf(home, src)
    ctx.formAway = (ctx.formAway ?? 0) + formDriftOf(away, src)
    ctx.suspHome = suspensionBurden(home, n, stage, src)
    ctx.suspAway = suspensionBurden(away, n, stage, src)
    if (stage === 'group') {
      const f = groupFixturesFor(format).find((x) => x.number === n)
      if (f) {
        const sh = stakesOf(home, f.group, f.matchday, src)
        const sa = stakesOf(away, f.group, f.matchday, src)
        ctx.stakesHome = sh
        ctx.stakesAway = sa
        if (bothSafe(sh, sa)) ctx.deadRubber = true
      }
    }
  }
  return ctx
}

/**
 * Deep fatigue: walk the feeder chain (up to three rounds back, decaying) —
 * extra time, shootouts, marathon shootouts, and knocks all leave residue.
 */
function deepFreshness(
  n: number,
  teamId: string,
  bracket: BracketState,
  format: Format,
): { freshness: number; comebackCarry: boolean } {
  let penalty = 0
  let comebackCarry = false
  let match = n
  let weight = 1
  for (let depth = 0; depth < 3; depth++) {
    const ko = koByNumberFor(format)[match]
    if (!ko) break
    let feederMatch: number | null = null
    for (const src of [ko.home, ko.away]) {
      if (src.kind !== 'matchWinner' && src.kind !== 'matchLoser') continue
      const feeder = bracket[src.match]
      if (!feeder || (feeder.winner !== teamId && feeder.loser !== teamId)) continue
      feederMatch = src.match
      const r = feeder.result
      if (!r || feeder.stale) break
      if (r.pens) penalty += 0.15 * weight
      else if (r.et) penalty += 0.1 * weight
      if (r.pensDetail && r.pensDetail.home.length >= 8) penalty += 0.05 * weight // the marathon toll
      const side = feeder.home === teamId ? 'home' : 'away'
      const knocks = (r.events ?? []).filter((e) => e.type === 'injury' && e.side === side).length
      penalty += 0.03 * knocks * weight
      if (depth === 0 && feeder.winner === teamId && (r.tags ?? []).includes('comeback')) comebackCarry = true
      break
    }
    if (feederMatch === null) break
    match = feederMatch
    weight *= 0.55
  }
  return { freshness: Math.max(1 - penalty, 0.6), comebackCarry }
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

/** the finals a changed semifinal must invalidate, in either format's key space */
const FINAL_OF: Partial<Record<PlayoffKey, PlayoffKey[]>> = {
  sf1: ['f1'],
  sf2: ['f2'],
  'a-sf1': ['a-f'],
  'a-sf2': ['a-f'],
  'b-sf1': ['b-f'],
  'b-sf2': ['b-f'],
  'c-sf1': ['c-f'],
  'c-sf2': ['c-f'],
  'd-sf1': ['d-f'],
  'd-sf2': ['d-f'],
}

export const useStore = create<TournamentState>()(
  persist(
    (set, get) => ({
      step: 'landing',
      theme: 'dark',
      uiZoom: 1,
      format: 48,
      qualMode: 'balanced',
      masterSeed: mintSeed(),
      chaos: { qualification: 1, seeding: 1, match: 1 },
      strategy: 'official',
      hosts: [...DEFAULT_HOSTS],
      hostsChosen: false,
      entries: [...DEFAULT_HOSTS],
      playoffTeams: [],
      playoffResults: {},
      pots: null,
      drawTrace: null,
      results: {},
      playoffLog: [],
      drawRunId: 0,
      ratingOverrides: {},
      modelParams: {},

      setStep: (s) => set({ step: s }),
      setTheme: (t) => set({ theme: t }),
      setUiZoom: (z) => set({ uiZoom: Math.min(1.3, Math.max(0.7, z)) }),
      setFormat: (f) => {
        if (get().format === f) return
        // the field, pots, draw, and every score are format-shaped — switching starts a clean slate
        set({
          format: f,
          entries: [...get().hosts],
          playoffTeams: [],
          playoffResults: {},
          pots: null,
          drawTrace: null,
          results: {},
          playoffLog: [],
        })
      },
      setQualMode: (m) => set({ qualMode: m }),
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
          entries: [...clean, ...keep].slice(0, fieldSizeFor(get().format)),
          playoffTeams: get().playoffTeams.filter((id) => !clean.includes(id)),
          playoffResults: {},
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

      togglePlayoffTeam: (id) => {
        const { entries, playoffTeams, format } = get()
        if (playoffTeams.includes(id)) {
          set({ playoffTeams: playoffTeams.filter((t) => t !== id), playoffResults: {}, pots: null, drawTrace: null, results: {} })
          return
        }
        if (!canAddPlayoff(entries, playoffTeams, id, format).ok) return
        set({ playoffTeams: [...playoffTeams, id], playoffResults: {}, pots: null, drawTrace: null, results: {} })
      },

      setPlayoffResult: (k, r) => {
        set((st) => {
          const playoffResults = { ...st.playoffResults }
          if (r === null) delete playoffResults[k]
          else playoffResults[k] = r
          // a changed semifinal invalidates its final
          for (const f of FINAL_OF[k] ?? []) delete playoffResults[f]
          return { playoffResults, pots: null, drawTrace: null, results: {} }
        })
      },

      simulatePlayoffMatch: (k) => {
        const { playoffTeams, playoffResults, chaos, masterSeed, format } = get()
        let home: string | null = null
        let away: string | null = null
        if (format === 64) {
          const po = playoff64State(playoffTeams, playoffResults)
          if (!po) return
          const t = po.tournaments.find((x) => x.id === k[0]!.toUpperCase())
          if (!t) return
          const pair = k.endsWith('sf1') ? t.sf1 : k.endsWith('sf2') ? t.sf2 : t.f
          ;[home, away] = pair
        } else {
          const po = playoffState(playoffTeams, playoffResults)
          if (!po) return
          ;[home, away] = po[k as PlayoffMatchKey]
        }
        if (!home || !away) return
        const r = simulateMatch(
          home,
          away,
          { stage: 'r32' },
          chaos.match,
          stream(masterSeed, `po:${k}:${Date.now() % 100000}`),
        )
        get().setPlayoffResult(k, r)
      },

      clearTeams: () =>
        set((st) => ({
          entries: [...st.hosts],
          playoffTeams: [],
          playoffResults: {},
          pots: null,
          drawTrace: null,
          results: {},
          playoffLog: [],
        })),

      simulateQualificationAction: () => {
        const { entries, hosts, chaos, masterSeed, format, qualMode } = get()
        const subSeed = `${masterSeed} qual:${Date.now() % 100000}`
        const { entries: full, playoffLog } = completeQualification(
          entries,
          hosts,
          chaos.qualification,
          stream(subSeed, 'qual'),
          format,
          qualMode,
        )
        set({
          entries: full,
          playoffLog,
          playoffTeams: [],
          playoffResults: {},
          pots: null,
          drawTrace: null,
          results: {},
        })
      },

      reseedPots: () => {
        const { entries, playoffTeams, playoffResults, hosts, strategy, chaos, masterSeed, format } = get()
        const size = fieldSizeFor(format)
        const winners =
          entries.length === size
            ? []
            : format === 64
              ? (playoff64State(playoffTeams, playoffResults)?.winners ?? [])
              : (playoffState(playoffTeams, playoffResults)?.winners ?? [])
        const full = [...entries, ...winners]
        if (full.length !== size) return
        const subSeed = `${masterSeed} seed:${Date.now() % 100000}`
        set({
          pots: seedPots(full, hosts, strategy, chaos.seeding, stream(subSeed, 'seed'), format),
          drawTrace: null,
          results: {},
        })
      },
      setPots: (p) => set({ pots: p, drawTrace: null, results: {} }),

      runDrawAction: () => {
        const { pots, hosts, masterSeed, drawRunId, format } = get()
        if (!pots || !validatePots(pots, hosts, format).ok) return
        const subSeed = `${masterSeed} draw:${drawRunId}`
        set({ drawTrace: runDraw(pots, hosts, stream(subSeed, 'draw'), format), results: {}, drawRunId: drawRunId + 1 })
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
        const { drawTrace, masterSeed, chaos, hosts, format } = get()
        const groups = groupsOf(drawTrace, format)
        if (!groups) return
        const f = groupFixturesFor(format).find((x) => x.number === n)
        if (!f) return
        const home = groups[f.group][f.homePos - 1]
        const away = groups[f.group][f.awayPos - 1]
        if (!home || !away) return
        const ctx = contextFor(n, home, away, hosts, null, masterSeed, format, { groups, results: get().results })
        const r = simulateMatch(home, away, ctx, chaos.match, stream(masterSeed, `match:${n}:${Date.now() % 100000}`))
        get().setResult(n, r)
      },

      simulateGroup: (g) => {
        const { drawTrace, masterSeed, chaos, results, hosts, format } = get()
        const groups = groupsOf(drawTrace, format)
        if (!groups) return
        const next = { ...results }
        for (const f of fixturesOfGroupFor(g, format)) {
          if (next[f.number]) continue
          const home = groups[g][f.homePos - 1]
          const away = groups[g][f.awayPos - 1]
          if (!home || !away) continue
          // matchday-ordered: stakes and suspensions read the results simulated so far
          const ctx = contextFor(f.number, home, away, hosts, null, masterSeed, format, { groups, results: next })
          next[f.number] = simulateMatch(home, away, ctx, chaos.match, stream(masterSeed, `match:${f.number}`))
        }
        set({ results: next })
      },

      simulateRemainingGroups: () => {
        const { drawTrace, masterSeed, chaos, results, hosts, format } = get()
        const groups = groupsOf(drawTrace, format)
        if (!groups) return
        const next = { ...results }
        for (const f of groupFixturesFor(format)) {
          if (next[f.number]) continue
          const home = groups[f.group][f.homePos - 1]
          const away = groups[f.group][f.awayPos - 1]
          if (!home || !away) continue
          const ctx = contextFor(f.number, home, away, hosts, null, masterSeed, format, { groups, results: next })
          next[f.number] = simulateMatch(home, away, ctx, chaos.match, stream(masterSeed, `match:${f.number}`))
        }
        set({ results: next })
      },

      simulateKoMatch: (n) => {
        const { drawTrace, masterSeed, chaos, results, hosts, format } = get()
        const groups = groupsOf(drawTrace, format)
        if (!groups) return
        const { bracket } = bracketState(groups, results, masterSeed, format)
        const m = bracket[n]
        if (!m?.home || !m.away) return
        const ctx = contextFor(n, m.home, m.away, hosts, bracket, masterSeed, format, { groups, results })
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
      clearModelParams: (keys) => {
        const next = { ...get().modelParams }
        for (const k of keys) delete next[k]
        setModelParams(next)
        set({ modelParams: next })
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
          for (const f of fixturesOfGroupFor(g, get().format)) delete results[f.number]
        }
        set({ drawTrace: next, results })
      },

      loadPreset: () => {
        set({
          format: 48,
          hosts: [...DEFAULT_HOSTS],
          hostsChosen: true,
          entries: [...PRESET_POTS.flat()],
          playoffTeams: [],
          playoffResults: {},
          pots: PRESET_POTS.map((p) => p.slice()),
          drawTrace: presetTrace(),
          results: {},
          playoffLog: [],
          step: 'groups',
        })
      },

      fullChaos: () => {
        const { format, qualMode } = get()
        const masterSeed = mintSeed()
        const chaos: ChaosKnobs = { qualification: 1, seeding: 1, match: 1 }
        const hosts = drawSurpriseHosts(`${masterSeed} hosts`) // the simulator decides who's hosting
        const { entries } = completeQualification([], hosts, chaos.qualification, stream(masterSeed, 'qual'), format, qualMode)
        const pots = seedPots(entries, hosts, 'noisy', chaos.seeding, stream(masterSeed, 'seed'), format)
        const trace = runDraw(pots, hosts, stream(masterSeed, 'draw'), format)
        const groups = groupsFromTrace(trace, format)
        const results: Record<number, MatchResult> = {}
        for (const f of groupFixturesFor(format)) {
          const home = groups[f.group][f.homePos - 1]!
          const away = groups[f.group][f.awayPos - 1]!
          const ctx = contextFor(f.number, home, away, hosts, null, masterSeed, format, { groups, results })
          results[f.number] = simulateMatch(home, away, ctx, chaos.match, stream(masterSeed, `match:${f.number}`))
        }
        const [koFrom, koTo] = koRangeFor(format)
        for (let n = koFrom; n <= koTo; n++) {
          const { bracket } = bracketState(groups, results, masterSeed, format)
          const m = bracket[n]!
          const ctx = contextFor(n, m.home!, m.away!, hosts, bracket, masterSeed, format, { groups, results })
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
          playoffTeams: [],
          playoffResults: {},
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
          playoffTeams: [],
          playoffResults: {},
          pots: null,
          drawTrace: null,
          results: {},
          playoffLog: [],
          strategy: 'official',
        }),
    }),
    {
      name: 'wcsim:tournament',
      version: 7,
      migrate: (persisted: unknown, version: number) => {
        const s = persisted as Record<string, unknown>
        if (version < 2) {
          s.hosts = [...DEFAULT_HOSTS]
          s.hostsChosen = true // existing saves were built on the 2026 trio
        }
        if (version < 3) s.ratingOverrides = {}
        if (version < 4) s.modelParams = {}
        if (version < 5) {
          s.playoffTeams = []
          s.playoffResults = {}
        }
        if (version < 6) s.uiZoom = 1
        if (version < 7) {
          s.format = 48 // every earlier save was a 48-team tournament
          s.qualMode = 'balanced'
        }
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
        uiZoom: s.uiZoom,
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
      }),
    },
  ),
)

/** The full field: direct entries plus hand-played play-off winners (already merged on simulated paths). */
export function tournamentEntries(
  s: Pick<TournamentState, 'entries' | 'playoffTeams' | 'playoffResults' | 'format'>,
): string[] {
  const size = fieldSizeFor(s.format)
  if (s.entries.length >= size) return s.entries
  const winners =
    s.format === 64
      ? (playoff64State(s.playoffTeams, s.playoffResults)?.winners ?? [])
      : (playoffState(s.playoffTeams, s.playoffResults)?.winners ?? [])
  return [...s.entries, ...winners]
}

/** Which steps are reachable for editing right now (viewing is always allowed). */
export function stepGates(
  s: Pick<
    TournamentState,
    'entries' | 'playoffTeams' | 'playoffResults' | 'hosts' | 'pots' | 'drawTrace' | 'results' | 'format'
  >,
) {
  const size = fieldSizeFor(s.format)
  const quota = quotaStatus(s.entries, s.hosts, s.format)
  const selectionReady =
    s.entries.length === size || // simulated qualification & legacy saves arrive complete
    (quota.complete && tournamentEntries(s).length === size)
  const potsOk = s.pots !== null && validatePots(s.pots, s.hosts, s.format).ok
  return {
    teams: true,
    pots: selectionReady,
    draw: selectionReady && potsOk,
    groups: s.drawTrace !== null,
    knockout: s.drawTrace !== null && allGroupsComplete(s.results, s.format),
  }
}
