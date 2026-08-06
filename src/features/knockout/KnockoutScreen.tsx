import NumberFlow from '@number-flow/react'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { CloudRain, CloudSun, Dices, FlaskConical, Maximize2, Mountain, NotebookText, Play, RotateCcw, Sun, Timer, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '../../components/Flag'
import { MatchReport } from '../../components/MatchReport'
import { MatchTheater } from '../../components/MatchTheater'
import { TrophyMark } from '../../components/TrophyMark'
import { ModelLab } from '../../components/ModelLab'
import { ScoreInput } from '../../components/ScoreInput'
import { TournamentPulse } from '../../components/TournamentPulse'
import { NATION_BY_ID, rankOf, shortName } from '../../data/nations'
import { WEATHER_LABEL, matchEnvironment } from '../../engine/environment'
import { matchRecap } from '../../engine/narrative'
import type { ResolvedKo } from '../../engine/bracket'
import {
  bronzeNumberFor,
  finalNumberFor,
  groupMatchCountFor,
  koByNumberFor,
  koMatchesFor,
  koRangeFor,
} from '../../engine/schedule'
import { detailedOdds, koWinner, stageOfMatchFor, type MatchContext } from '../../engine/simulate'
import { allGroupsComplete, bracketState } from '../../engine/tournament'
import { groupsOf, useStore } from '../../store/store'
import type { Format, KoSource, MatchEvent, MatchResult } from '../../engine/types'

/**
 * True mirrored bracket: two wings converging on a center Final column.
 * One CSS grid, 16 rows; node cells span 2/4/8/16 rows so every round centers on its
 * feeders, with elbow connectors drawn between columns — the champion's road turns gold.
 * Both formats share the tree shape (16 R32 ties); only the match numbers differ.
 */
const WINGS: Record<Format, { left: WingSpec; right: WingSpec }> = {
  48: {
    left: { r32: [74, 77, 73, 75, 83, 84, 81, 82], r16: [89, 90, 93, 94], qf: [97, 98], sf: [101] },
    right: { r32: [76, 78, 79, 80, 86, 88, 85, 87], r16: [91, 92, 95, 96], qf: [99, 100], sf: [102] },
  },
  64: {
    left: { r32: [97, 98, 99, 100, 101, 102, 103, 104], r16: [113, 114, 115, 116], qf: [121, 122], sf: [125] },
    right: { r32: [105, 106, 107, 108, 109, 110, 111, 112], r16: [117, 118, 119, 120], qf: [123, 124], sf: [126] },
  },
}
interface WingSpec {
  r32: number[]
  r16: number[]
  qf: number[]
  sf: number[]
}

function sourceLabel(src: KoSource): string {
  switch (src.kind) {
    case 'winner':
      return `Group ${src.group} winner`
    case 'runnerUp':
      return `Group ${src.group} runner-up`
    case 'third':
      return `3rd · ${src.cands.join('/')}`
    case 'matchWinner':
      return `Winner of Match ${src.match}`
    case 'matchLoser':
      return `Loser of Match ${src.match}`
  }
}

export function KnockoutScreen() {
  const drawTrace = useStore((s) => s.drawTrace)
  const results = useStore((s) => s.results)
  const masterSeed = useStore((s) => s.masterSeed)
  const format = useStore((s) => s.format)
  const simulateKoMatch = useStore((s) => s.simulateKoMatch)
  const { left: LEFT, right: RIGHT } = WINGS[format]
  const FINAL_N = finalNumberFor(format)
  const BRONZE_N = bronzeNumberFor(format)
  const koMatches = koMatchesFor(format)
  const [openMatch, setOpenMatch] = useState<number | null>(null)
  const [showChampion, setShowChampion] = useState(true)
  const [screenLabOpen, setScreenLabOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [fitMode, setFitMode] = useState(true)
  const wrapRef = useRef<HTMLDivElement>(null)
  const BRACKET_W = 2056

  const fitZoom = () => {
    const w = wrapRef.current?.clientWidth ?? 0
    return w > 0 ? Math.min(1.25, Math.max(0.45, +(w / BRACKET_W).toFixed(2))) : 1
  }
  useLayoutEffect(() => {
    if (fitMode) setZoom(fitZoom())
  }, [fitMode])
  useEffect(() => {
    if (!fitMode) return
    const onR = () => setZoom(fitZoom())
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [fitMode])

  const groups = useMemo(() => groupsOf(drawTrace, format), [drawTrace, format])
  const complete = allGroupsComplete(results, format)
  const state = useMemo(
    () => (groups ? bracketState(groups, results, masterSeed, format) : null),
    [groups, results, masterSeed, format],
  )

  if (!groups || !state) {
    return (
      <div className="page empty-stage">
        <TrophyMark height={64} className="dim" />
        <p className="serif-accent" style={{ fontSize: 19, margin: 0, color: 'var(--text-mid)' }}>
          The bracket sleeps until the groups have spoken.
        </p>
        <p className="low" style={{ margin: 0 }}>
          Run the draw, then enter or simulate all {format === 64 ? 'ninety-six' : 'seventy-two'} group scores.
        </p>
      </div>
    )
  }

  const bracket = state.bracket
  const champion = bracket[FINAL_N]?.winner ?? null
  const finalMatch = bracket[FINAL_N]

  const liveStage = (() => {
    for (const st of ['R32', 'R16', 'QF', 'SF', 'FINAL'] as const) {
      const open = koMatches.some((m) => {
        if (m.stage !== st) return false
        const nd = bracket[m.number]
        return Boolean(nd?.home && nd.away && !nd.winner)
      })
      if (open) return st
    }
    return null
  })()
  const headClass = (st: string) => `bhead${liveStage === st ? ' live' : ''}`

  const node = (n: number, row: string, col: number, compact = false) => (
    <div key={n} data-m={n} style={{ gridRow: row, gridColumn: col, display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <KoNode node={bracket[n]!} compact={compact} onOpen={() => setOpenMatch(n)} />
    </div>
  )

  const conn = (childMatch: number, row: string, col: number, side: 'l' | 'r', straight = false) => {
    const decided = Boolean(bracket[childMatch]?.winner)
    return (
      <div
        key={`c${col}-${row}`}
        className={`bconn ${side}${straight ? ' straight' : ''}${decided ? ' won' : ''}`}
        style={{ gridRow: row, gridColumn: col }}
        aria-hidden
      />
    )
  }

  return (
    <div className="page">
      <div className="row spread" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <div className="kicker serif-accent">Thirty-two remain. One lifts it.</div>
          <h2 className="display" style={{ fontSize: 34, margin: 0 }}>
            Knockout Stage
          </h2>
        </div>
        {!complete && (
          <span className="chip">
            Awaiting the group stage — the wings fill once all {groupMatchCountFor(format)} scores are entered
          </span>
        )}
        <button className="btn small" onClick={() => setScreenLabOpen(true)} title="Tune the simulation engine — dials apply to every match you simulate from here">
          <FlaskConical size={14} /> Model Lab
        </button>
        {complete && (
          <button
            className="btn small gold-line"
            onClick={() => {
              for (const m of koMatches) {
                const cur = useStore.getState()
                const gs = groupsOf(cur.drawTrace, cur.format)!
                const st = bracketState(gs, cur.results, cur.masterSeed, cur.format)
                const nd = st.bracket[m.number]!
                if (!nd.result && nd.home && nd.away) simulateKoMatch(m.number)
              }
            }}
          >
            <Dices size={14} /> Simulate remaining
          </button>
        )}
      </div>

      <TournamentPulse groups={groups} bracket={bracket} results={results} />

      <div className="zoom-dock" role="group" aria-label="Bracket zoom">
        <button
          className="dice-btn"
          onClick={() => {
            setFitMode(false)
            setZoom((z) => Math.max(0.45, +(z - 0.05).toFixed(2)))
          }}
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <input
          className="chaos-slider zoom-slider"
          type="range"
          min={45}
          max={125}
          value={Math.round(zoom * 100)}
          onChange={(e) => {
            setFitMode(false)
            setZoom(Number(e.target.value) / 100)
          }}
          aria-label="Bracket zoom"
        />
        <button
          className="dice-btn"
          onClick={() => {
            setFitMode(false)
            setZoom((z) => Math.min(1.25, +(z + 0.05).toFixed(2)))
          }}
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
        <span className="tnum zoom-pct">{Math.round(zoom * 100)}%</span>
        <button className={`btn small${fitMode ? ' gold-line' : ''}`} onClick={() => setFitMode(true)} title="Fit the whole bracket to your screen">
          <Maximize2 size={13} /> Fit
        </button>
        <button className="btn small" onClick={() => { setFitMode(false); setZoom(1) }} title="Actual size">
          1:1
        </button>
      </div>

      <div className="bracket-wrap" ref={wrapRef}>
        <div className="bracket2" style={{ zoom }}>
          <ChampionThread champion={champion} bracket={bracket} zoom={zoom} />
          {/* round headers */}
          <div className={headClass('R32')} style={{ gridColumn: 1 }}>Round of 32</div>
          <div className={headClass('R16')} style={{ gridColumn: 3 }}>Round of 16</div>
          <div className={headClass('QF')} style={{ gridColumn: 5 }}>Quarterfinal</div>
          <div className={headClass('SF')} style={{ gridColumn: 7 }}>Semifinal</div>
          <div className={`${headClass('FINAL')} gold-text`} style={{ gridColumn: 9 }}>Final</div>
          <div className={headClass('SF')} style={{ gridColumn: 11 }}>Semifinal</div>
          <div className={headClass('QF')} style={{ gridColumn: 13 }}>Quarterfinal</div>
          <div className={headClass('R16')} style={{ gridColumn: 15 }}>Round of 16</div>
          <div className={headClass('R32')} style={{ gridColumn: 17 }}>Round of 32</div>

          {/* left wing */}
          {LEFT.r32.map((n, i) => node(n, `${2 * i + 2} / span 2`, 1, true))}
          {LEFT.r16.map((n, j) => [conn(n, `${4 * j + 2} / span 4`, 2, 'l'), node(n, `${4 * j + 2} / span 4`, 3)])}
          {LEFT.qf.map((n, k) => [conn(n, `${8 * k + 2} / span 8`, 4, 'l'), node(n, `${8 * k + 2} / span 8`, 5)])}
          {LEFT.sf.map((n) => [conn(n, `2 / span 16`, 6, 'l'), node(n, `2 / span 16`, 7)])}
          {conn(FINAL_N, `2 / span 16`, 8, 'l', true)}

          {/* center: champion, final, bronze */}
          <div className="bcenter" style={{ gridRow: '2 / span 16', gridColumn: 9 }}>
            <div className="champ-slot">
              {champion ? (
                <>
                  <div className="trophy-medal won" data-m="trophy">
                    <Flag id={champion} size={64} ringed />
                  </div>
                  <div className="champ-name display">{NATION_BY_ID.get(champion)?.name}</div>
                  <div className="champ-caption">Champions</div>
                </>
              ) : (
                <>
                  <div className="trophy-medal">
                    <div className="champ-ghost">
                      <TrophyMark height={46} />
                    </div>
                  </div>
                  <div className="champ-caption dim">The trophy</div>
                </>
              )}
            </div>
            <div data-m={FINAL_N}>
              <KoNode node={bracket[FINAL_N]!} onOpen={() => setOpenMatch(FINAL_N)} final />
            </div>
            <div className="bronze-wrap">
              <div className="champ-caption dim" style={{ justifyContent: 'center', marginBottom: 6 }}>Bronze</div>
              <KoNode node={bracket[BRONZE_N]!} compact onOpen={() => setOpenMatch(BRONZE_N)} />
            </div>
          </div>

          {/* right wing (mirrored) */}
          {conn(FINAL_N, `2 / span 16`, 10, 'r', true)}
          {RIGHT.sf.map((n) => [node(n, `2 / span 16`, 11), conn(n, `2 / span 16`, 12, 'r')])}
          {RIGHT.qf.map((n, k) => [node(n, `${8 * k + 2} / span 8`, 13), conn(n, `${8 * k + 2} / span 8`, 14, 'r')])}
          {RIGHT.r16.map((n, j) => [node(n, `${4 * j + 2} / span 4`, 15), conn(n, `${4 * j + 2} / span 4`, 16, 'r')])}
          {RIGHT.r32.map((n, i) => node(n, `${2 * i + 2} / span 2`, 17, true))}
        </div>
      </div>

      {openMatch !== null && bracket[openMatch] && (
        <MatchPanel
          node={bracket[openMatch]!}
          onClose={() => setOpenMatch(null)}
          onDice={() => simulateKoMatch(openMatch)}
        />
      )}

      {screenLabOpen && <ModelLab onClose={() => setScreenLabOpen(false)} />}

      {champion && finalMatch?.result && showChampion && (
        <ChampionScene champion={champion} final={finalMatch} bracket={bracket} onClose={() => setShowChampion(false)} />
      )}
    </div>
  )
}

/** One continuous molten thread tracing the champion's road from Round of 32 to the trophy. */
function ChampionThread({ champion, bracket, zoom = 1 }: { champion: string | null; bracket: Record<number, ResolvedKo>; zoom?: number }) {
  const format = useStore((s) => s.format)
  const [path, setPath] = useState<string | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const road = useMemo(() => {
    if (!champion) return []
    const r: number[] = []
    const [from, to] = koRangeFor(format)
    for (let n = from; n <= to; n++) {
      const m = bracket[n]
      if (m && m.winner === champion && (m.home === champion || m.away === champion)) r.push(n)
    }
    return r
  }, [champion, bracket, format])

  useLayoutEffect(() => {
    if (!champion || road.length < 2) {
      setPath(null)
      return
    }
    const compute = () => {
      const grid = document.querySelector('.bracket2') as HTMLElement | null
      if (!grid) return
      const gr = grid.getBoundingClientRect()
      const pts: [number, number][] = []
      for (const n of [...road, 'trophy']) {
        const el = grid.querySelector(`[data-m="${n}"]`)
        if (!el) continue
        const r = el.getBoundingClientRect()
        pts.push([(r.left - gr.left + r.width / 2) / zoom, (r.top - gr.top + r.height / 2) / zoom])
      }
      if (pts.length < 2) {
        setPath(null)
        return
      }
      let d = `M ${pts[0]![0]} ${pts[0]![1]}`
      for (let i = 1; i < pts.length; i++) {
        const [x1, y1] = pts[i - 1]!
        const [x2, y2] = pts[i]!
        const mx = (x1 + x2) / 2
        d += ` C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
      }
      setPath(d)
      setSize({ w: grid.scrollWidth, h: grid.scrollHeight })
    }
    compute()
    const settle = setTimeout(compute, 400)
    window.addEventListener('resize', compute)
    return () => {
      clearTimeout(settle)
      window.removeEventListener('resize', compute)
    }
  }, [champion, road, zoom])

  if (!path) return null
  return (
    <svg
      className="champ-thread"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden
    >
      <path d={path} pathLength={1} className="thread-halo" />
      <path d={path} pathLength={1} className="thread-core" />
    </svg>
  )
}

const STAGE_FULL: Record<string, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarterfinal',
  SF: 'Semifinal',
  THIRD: 'Bronze Final',
  FINAL: 'Final',
}

function scoreText(node: ResolvedKo): { home: string; away: string; note: string | null } {
  const r = node.result
  if (!r || node.stale) return { home: '', away: '', note: null }
  const h = r.score.home === null ? '' : String(r.score.home + (r.et?.home ?? 0))
  const a = r.score.away === null ? '' : String(r.score.away + (r.et?.away ?? 0))
  let note: string | null = null
  if (r.pens) note = `pens ${r.pens.home ?? '·'}–${r.pens.away ?? '·'}`
  else if (r.et) note = 'aet'
  return { home: h, away: a, note }
}

function KoNode({
  node,
  onOpen,
  compact = false,
  final = false,
}: {
  node: ResolvedKo
  onOpen: () => void
  compact?: boolean
  final?: boolean
}) {
  const format = useStore((s) => s.format)
  const ko = koByNumberFor(format)[node.number]!
  const { home: hs, away: as_, note } = scoreText(node)
  const ghost = !node.home || !node.away
  const nameOf = (id: string) => NATION_BY_ID.get(id)?.name ?? id
  const loser = node.winner ? (node.winner === node.home ? node.away : node.home) : null
  const upset = Boolean(node.winner && loser && rankOf(node.winner) > rankOf(loser))
  return (
    <button
      className={`card ko-node ks-${ko.stage.toLowerCase()}${ghost ? ' ghost' : ''}${node.winner ? ' done' : ''}${compact ? ' compact' : ''}${final ? ' final-node' : ''}${node.number === bronzeNumberFor(format) ? ' bronze' : ''}`}
      onClick={onOpen}
      disabled={ghost}
      aria-label={`Match ${node.number}`}
    >
      <span className={`side${node.winner && node.winner === node.home ? ' winner' : ''}`}>
        {node.home ? (
          <>
            <Flag id={node.home} size={compact ? 18 : 22} />
            <span className="cname" title={nameOf(node.home)}>
              {nameOf(node.home)}
            </span>
            {upset && node.winner === node.home && (
              <span className="upset" title="Upset — the lower-ranked side advances">†</span>
            )}
          </>
        ) : (
          <span className="low src">{sourceLabel(ko.home)}</span>
        )}
        <span className="score tnum">{hs}</span>
      </span>
      <span className={`side${node.winner && node.winner === node.away ? ' winner' : ''}`}>
        {node.away ? (
          <>
            <Flag id={node.away} size={compact ? 18 : 22} />
            <span className="cname" title={nameOf(node.away)}>
              {nameOf(node.away)}
            </span>
            {upset && node.winner === node.away && (
              <span className="upset" title="Upset — the lower-ranked side advances">†</span>
            )}
          </>
        ) : (
          <span className="low src">{sourceLabel(ko.away)}</span>
        )}
        <span className="score tnum">{as_}</span>
      </span>
      {(note || node.stale) && (
        <span
          className={`verdict${node.stale ? ' stale' : note!.startsWith('pens') ? ' pens' : ' aet'}`}
          aria-label={node.stale ? 'Result set aside' : note!.startsWith('pens') ? 'Decided on penalties' : 'Decided in extra time'}
        >
          {node.stale ? (
            'Set aside'
          ) : note!.startsWith('pens') ? (
            <>
              <i className="v-ball" />
              Penalties <b className="tnum">{note!.slice(5)}</b>
            </>
          ) : (
            <>
              <Timer size={9} />
              After extra time
            </>
          )}
        </span>
      )}
      <span className="meta">
        <span className={`mtag stage-${ko.stage.toLowerCase()}`}>
          <i className="mdot" />
          {STAGE_FULL[ko.stage]}
        </span>
        <span className="mnum tnum">Match {node.number}</span>
      </span>
    </button>
  )
}

/** The shoot-out as it happened: kick-by-kick gold and misses, winner aglow. */
function ShootoutBoard({ r, home, away }: { r: MatchResult; home: string; away: string }) {
  if (!r.pens || r.pens.home === null || r.pens.away === null || r.pens.home === r.pens.away) return null
  const winSide = r.pens.home > r.pens.away ? 'home' : 'away'
  return (
    <div className="shootout">
      <div className="shootout-title">Penalty shoot-out</div>
      {(['home', 'away'] as const).map((side) => {
        const id = side === 'home' ? home : away
        const seq = r.pensDetail?.[side] ?? null
        const total = r.pens![side]!
        return (
          <div key={side} className={`shootout-row${winSide === side ? ' winner' : ''}`}>
            <Flag id={id} size={22} />
            <span className="so-name display">{NATION_BY_ID.get(id)?.name}</span>
            <span className="so-kicks">
              {seq
                ? seq.map((scored, i) => (
                    <i
                      key={i}
                      className={`so-kick${scored ? ' scored' : ' missed'}${i === 5 ? ' sd-start' : ''}`}
                      style={{ animationDelay: `${i * 90}ms` }}
                      title={`Kick ${i + 1} — ${scored ? 'scored' : 'missed'}`}
                    >
                      {scored ? '' : '×'}
                    </i>
                  ))
                : Array.from({ length: Math.max(5, total) }, (_, i) => (
                    <i
                      key={i}
                      className={`so-kick${i < total ? ' scored' : ' blank'}${i === 5 ? ' sd-start' : ''}`}
                      style={{ animationDelay: `${i * 90}ms` }}
                    />
                  ))}
            </span>
            <span className="so-total display tnum">{total}</span>
          </div>
        )
      })}
    </div>
  )
}

/** The minute engine's story of the match: goals and cards on a timeline. */
function MatchTimeline({ r, home, away }: { r: MatchResult; home: string; away: string }) {
  if (!r.events || r.events.length === 0) return null
  const label = (e: MatchEvent) => (e.side === 'home' ? home : away)
  return (
    <div className="timeline">
      {r.stats && (
        <div className="stat-duel tnum">
          <span title="Expected goals (accumulated by the minute engine)">
            xG <b>{r.stats.xgHome.toFixed(1)}</b>–<b>{r.stats.xgAway.toFixed(1)}</b>
          </span>
          <span title="Shots">
            shots <b>{r.stats.shotsHome}</b>–<b>{r.stats.shotsAway}</b>
          </span>
          <span title="Possession">
            poss <b>{Math.round(r.stats.possHome * 100)}%</b>–<b>{Math.round((1 - r.stats.possHome) * 100)}%</b>
          </span>
        </div>
      )}
      <div className="timeline-rail">
        {r.events.map((e, i) => (
          <span key={i} className={`tl-event ${e.type}${e.side === 'away' ? ' away' : ''}`}>
            <span className="tl-min tnum">{e.min}′</span>
            <i className={`tl-ico ${e.type}`} aria-label={e.type} />
            <span className="tl-team">{label(e)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function MatchPanel({ node, onClose, onDice }: { node: ResolvedKo; onClose: () => void; onDice: () => void }) {
  const setResult = useStore((s) => s.setResult)
  const hosts = useStore((s) => s.hosts)
  const chaos = useStore((s) => s.chaos)
  const modelParams = useStore((s) => s.modelParams)
  const ratingOverrides = useStore((s) => s.ratingOverrides)
  const format = useStore((s) => s.format)
  const [labOpen, setLabOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [oddsOpen, setOddsOpen] = useState(false)
  const [theaterOpen, setTheaterOpen] = useState(false)
  const ko = koByNumberFor(format)[node.number]!
  const r = node.result && !node.stale ? node.result : null
  const home = node.home!
  const away = node.away!

  const ctx: MatchContext = useMemo(
    () => ({
      stage: stageOfMatchFor(node.number, format),
      homeHost: hosts.includes(home),
      awayHost: hosts.includes(away),
    }),
    [node.number, home, away, hosts, format],
  )
  const odds = useMemo(
    () => detailedOdds(home, away, ctx, chaos.match),
    [home, away, ctx, chaos.match, modelParams, ratingOverrides],
  )
  const pct = (x: number) => `${Math.round(x * 100)}%`

  const commit = (patch: Partial<MatchResult>) => {
    const base: MatchResult = r ?? { score: { home: null, away: null } }
    const next: MatchResult = { ...base, ...patch, enteredFor: [home, away] }
    const partial = next.score.home === null || next.score.away === null
    if (partial || next.score.home !== next.score.away) {
      delete next.et
      delete next.pens
      delete next.pensDetail
    } else if (next.et && next.et.home !== null && next.et.home !== next.et.away) {
      delete next.pens
      delete next.pensDetail
    }
    if (patch.pens !== undefined) delete next.pensDetail
    delete next.simulated
    setResult(node.number, next)
  }

  const env = useMemo(() => {
    const seed = useStore.getState().masterSeed
    return matchEnvironment(seed, node.number)
  }, [node.number])
  const recap = r ? matchRecap(r, home, away) : null

  const level90 = r ? r.score.home !== null && r.score.home === r.score.away : false
  const levelET = r?.et ? r.et.home !== null && r.et.home === r.et.away : false
  const needsPens = level90 && levelET && r?.et !== undefined
  const decided = r ? koWinner(home, away, r) : null

  return (
    <>
      <div className="overlay" style={{ background: 'rgba(4,7,6,0.4)' }} onClick={onClose} />
      <aside className="slideover" aria-label={`Match ${node.number}`}>
        <div className="match-hero">
          <div className="team">
            <Flag id={home} size={64} ringed={hosts.includes(home)} />
            <span className="nm display">{NATION_BY_ID.get(home)?.name}</span>
            {hosts.includes(home) && <span className="chip gold">Host nation</span>}
          </div>
          <div className="display low" style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
            Match {node.number}
            <br />
            <span className="gold-text">{STAGE_FULL[ko.stage]}</span>
          </div>
          <div className="team">
            <Flag id={away} size={64} ringed={hosts.includes(away)} />
            <span className="nm display">{NATION_BY_ID.get(away)?.name}</span>
            {hosts.includes(away) && <span className="chip gold">Host nation</span>}
          </div>
        </div>
        <div className="match-panel-body">
          <div className="env-row">
            <span className={`env-chip wx-${env.weather}`}>
              {env.weather === 'rain' ? (
                <CloudRain size={12} />
              ) : env.weather === 'heat' ? (
                <Sun size={12} />
              ) : env.weather === 'altitude' ? (
                <Mountain size={12} />
              ) : (
                <CloudSun size={12} />
              )}
              {WEATHER_LABEL[env.weather]} · {env.tempC}°C
            </span>
          </div>
          <div className={`odds-card capsule${oddsOpen ? ' open' : ''}`}>
            <div className="row spread" style={{ fontSize: 12, fontWeight: 600 }}>
              <span>
                {shortName(home)}{' '}
                <NumberFlow
                  className="gold-text tnum"
                  value={odds.advHome}
                  format={{ style: 'percent', maximumFractionDigits: 0 }}
                />
              </span>
              <span className="low" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                TO ADVANCE
              </span>
              <span>
                <NumberFlow
                  className="gold-text tnum"
                  value={odds.advAway}
                  format={{ style: 'percent', maximumFractionDigits: 0 }}
                />{' '}
                {shortName(away)}
              </span>
            </div>
            <div className="odds-bar big">
              <i style={{ width: pct(odds.advHome) }} />
              <i className="a" style={{ width: pct(odds.advAway) }} />
            </div>
            <div className="odds-bar" title="90-minute result probabilities">
              <i style={{ width: pct(odds.home) }} />
              <i className="d" style={{ width: pct(odds.draw) }} />
              <i className="a" style={{ width: pct(odds.away) }} />
            </div>
            <div className="row spread low" style={{ fontSize: 11 }}>
              <span>win {pct(odds.home)}</span>
              <span>draw {pct(odds.draw)}</span>
              <span>win {pct(odds.away)}</span>
            </div>
            <button className="odds-toggle" onClick={() => setOddsOpen((o) => !o)} aria-expanded={oddsOpen}>
              {oddsOpen ? 'Hide the full market' : 'Open the full market'}
              <i className="chev" aria-hidden />
            </button>
            {oddsOpen && (
            <div className="odds-more">
            <div className="market-row tnum">
              <span title="Expected goals">
                xG <b>{odds.lamHome.toFixed(2)}–{odds.lamAway.toFixed(2)}</b>
              </span>
              <span title="Both teams to score">
                BTTS <b>{pct(odds.btts)}</b>
              </span>
              <span title="Three or more goals">
                O2.5 <b>{pct(odds.over25)}</b>
              </span>
              <span title="Clean sheet probability">
                CS <b>{pct(odds.cleanSheetHome)}</b>/<b>{pct(odds.cleanSheetAway)}</b>
              </span>
            </div>
            <div className="scoreline-chips">
              {odds.topScorelines.map((l) => (
                <span key={`${l.h}-${l.a}`} className="chip tnum" title={`${pct(l.p)} likely`}>
                  {l.h}–{l.a} <span className="low">{pct(l.p)}</span>
                </span>
              ))}
            </div>
            {(odds.factors.home.length > 0 || odds.factors.away.length > 0) && (
              <div className="factor-rows low" style={{ fontSize: 11 }}>
                {odds.factors.home.length > 0 && (
                  <div>
                    {shortName(home)}: {odds.factors.home.join(' · ')}
                  </div>
                )}
                {odds.factors.away.length > 0 && (
                  <div>
                    {shortName(away)}: {odds.factors.away.join(' · ')}
                  </div>
                )}
              </div>
            )}
            <button className="btn ghost small" style={{ alignSelf: 'center' }} onClick={() => setLabOpen(true)}>
              <FlaskConical size={13} /> Tune the model
            </button>
            </div>
            )}
          </div>

          <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
            <ScoreInput
              label={`${home} goals`}
              value={r?.score.home ?? null}
              onCommit={(v) => commit({ score: { home: v, away: r?.score.away ?? null } })}
            />
            <span className="display low" style={{ fontSize: 24 }}>
              –
            </span>
            <ScoreInput
              label={`${away} goals`}
              value={r?.score.away ?? null}
              onCommit={(v) => commit({ score: { home: r?.score.home ?? null, away: v } })}
            />
          </div>

          {level90 && r && (
            <div style={{ textAlign: 'center' }}>
              <div className="chip" style={{ marginBottom: 8 }}>
                Level after 90′ — extra time
              </div>
              <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
                <ScoreInput
                  small
                  label={`${home} extra-time goals`}
                  value={r.et?.home ?? null}
                  onCommit={(v) => commit({ et: { home: v, away: r.et?.away ?? null } })}
                />
                <span className="low">ET</span>
                <ScoreInput
                  small
                  label={`${away} extra-time goals`}
                  value={r.et?.away ?? null}
                  onCommit={(v) => commit({ et: { home: r.et?.home ?? null, away: v } })}
                />
              </div>
            </div>
          )}

          {needsPens && r && (
            <div style={{ textAlign: 'center' }}>
              <div className="chip" style={{ marginBottom: 8 }}>
                Still level — penalty shoot-out
              </div>
              <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
                <ScoreInput
                  small
                  label={`${home} penalties`}
                  value={r.pens?.home ?? null}
                  onCommit={(v) => commit({ pens: { home: v, away: r.pens?.away ?? null } })}
                />
                <span className="low">pens</span>
                <ScoreInput
                  small
                  label={`${away} penalties`}
                  value={r.pens?.away ?? null}
                  onCommit={(v) => commit({ pens: { home: r.pens?.home ?? null, away: v } })}
                />
              </div>
              {r.pens && r.pens.home === r.pens.away && (
                <p className="low" style={{ fontSize: 12 }}>
                  A shoot-out needs a winner — adjust one side.
                </p>
              )}
            </div>
          )}

          {r && r.events && r.events.length > 0 && (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn gold-line small" onClick={() => setTheaterOpen(true)}>
                <Play size={14} /> Watch replay
              </button>
              <button className="btn gold-line small" onClick={() => setReportOpen(true)}>
                <NotebookText size={14} /> Match report
              </button>
            </div>
          )}
          {r && <ShootoutBoard r={r} home={home} away={away} />}
          {r && <MatchTimeline r={r} home={home} away={away} />}
          {recap && <p className="recap serif-accent">{recap}</p>}

          {decided && (
            <p style={{ textAlign: 'center', margin: 0 }} className="gold-text display">
              {NATION_BY_ID.get(decided)?.name} advance
            </p>
          )}

          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn gold-line small" onClick={onDice}>
              <Dices size={14} /> Simulate
            </button>
            {r && (
              <button className="btn ghost small danger" onClick={() => setResult(node.number, null)}>
                <RotateCcw size={14} /> Clear
              </button>
            )}
            <button className="btn small" onClick={onClose}>
              <X size={14} /> Close
            </button>
          </div>
        </div>
      </aside>
      {labOpen && <ModelLab onClose={() => setLabOpen(false)} />}
      {theaterOpen && r && (
        <div
          className="overlay"
          role="dialog"
          aria-modal
          aria-label="Match replay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTheaterOpen(false)
          }}
        >
          <div className="dialog theater-dialog">
            <button className="btn icon ghost host-close" onClick={() => setTheaterOpen(false)} aria-label="Close">
              <X size={16} />
            </button>
            <div className="kicker serif-accent" style={{ textAlign: 'center' }}>
              The match, replayed
            </div>
            <MatchTheater r={r} home={home} away={away} autoplay />
          </div>
        </div>
      )}
      {reportOpen && r && (
        <MatchReport
          r={r}
          home={home}
          away={away}
          matchNo={node.number}
          stageLabel={STAGE_FULL[ko.stage] ?? ko.stage}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  )
}

function ChampionScene({
  champion,
  final,
  bracket,
  onClose,
}: {
  champion: string
  final: ResolvedKo
  bracket: Record<number, ResolvedKo>
  onClose: () => void
}) {
  const format = useStore((s) => s.format)
  const nation = NATION_BY_ID.get(champion)
  const r = final.result!
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const fire = confetti.create(canvas, { resize: true, useWorker: false })
    const gold = ['#e5c87f', '#d2b064', '#f2efe6', '#8a7443']
    // the cup is lifted: one great burst beneath the name
    fire({ particleCount: 160, spread: 80, startVelocity: 52, origin: { y: 0.62 }, colors: gold, scalar: 1.05 })
    const t1 = setTimeout(() => {
      // side cannons
      fire({ particleCount: 70, angle: 60, spread: 55, origin: { x: 0, y: 0.72 }, colors: gold })
      fire({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1, y: 0.72 }, colors: gold })
    }, 380)
    const t2 = setTimeout(() => {
      // golden rain from the roof
      fire({
        particleCount: 110,
        spread: 150,
        startVelocity: 32,
        decay: 0.92,
        gravity: 0.8,
        origin: { y: -0.05 },
        colors: gold,
        scalar: 0.9,
      })
    }, 950)
    const t3 = setTimeout(() => {
      // star-shell fireworks over each shoulder
      fire({
        particleCount: 48,
        spread: 360,
        startVelocity: 30,
        gravity: 0.6,
        ticks: 90,
        origin: { x: 0.3, y: 0.3 },
        colors: gold,
        shapes: ['star'],
        scalar: 1.15,
      })
      fire({
        particleCount: 48,
        spread: 360,
        startVelocity: 30,
        gravity: 0.6,
        ticks: 90,
        origin: { x: 0.7, y: 0.26 },
        colors: gold,
        shapes: ['star'],
        scalar: 1.15,
      })
    }, 1550)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      fire.reset()
    }
  }, [])

  const road: number[] = []
  const [koFrom, koTo] = koRangeFor(format)
  for (let n = koFrom; n <= koTo; n++) {
    const m = bracket[n]
    if (m && (m.home === champion || m.away === champion)) road.push(n)
  }

  const h = (r.score.home ?? 0) + (r.et?.home ?? 0)
  const a = (r.score.away ?? 0) + (r.et?.away ?? 0)

  return (
    <div className="champion" role="dialog" aria-label="Champions">
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div className="scene">
        <div className="crown serif-accent">Champions of the world</div>
        <TrophyMark height={84} className="float" />
        <Flag id={champion} size={80} ringed />
        <h1 className="display">{nation?.name}</h1>
        <div className="scoreline tnum display">
          {NATION_BY_ID.get(final.home!)?.name} {h}–{a} {NATION_BY_ID.get(final.away!)?.name}
          {r.pens ? ` · pens ${r.pens.home}–${r.pens.away}` : r.et ? ' · aet' : ''}
        </div>

        <div className="glory card">
          <div className="glory-head serif-accent">The road to glory</div>
          {road.map((n, i) => {
            const m = bracket[n]!
            const mr = m.result!
            const opp = (m.home === champion ? m.away : m.home)!
            const asHome = m.home === champion
            const hs = (mr.score.home ?? 0) + (mr.et?.home ?? 0)
            const as_ = (mr.score.away ?? 0) + (mr.et?.away ?? 0)
            const mine = asHome ? hs : as_
            const theirs = asHome ? as_ : hs
            const note = mr.pens
              ? `pens ${asHome ? mr.pens.home : mr.pens.away}–${asHome ? mr.pens.away : mr.pens.home}`
              : mr.et
                ? 'aet'
                : null
            return (
              <motion.div
                key={n}
                className="glory-row"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.22, duration: 0.5, ease: [0.2, 0, 0, 1] }}
              >
                <span className="glory-stage">{STAGE_FULL[koByNumberFor(format)[n]!.stage]}</span>
                <Flag id={opp} size={26} />
                <span className="glory-opp">{NATION_BY_ID.get(opp)?.name}</span>
                <span className="glory-score display tnum">
                  {mine}–{theirs}
                  {note && <em>{note}</em>}
                </span>
              </motion.div>
            )
          })}
          <motion.div
            className="glory-row crowned"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + road.length * 0.22 + 0.15, duration: 0.6, ease: [0.2, 0, 0, 1] }}
          >
            <span className="glory-stage gold-text">World Cup</span>
            <TrophyMark height={26} />
            <span className="glory-opp gold-text">The trophy is theirs</span>
            <span className="glory-score display gold-text">✦</span>
          </motion.div>
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn primary" onClick={onClose}>
            Back to the bracket
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              if (confirm('Start a new tournament?')) useStore.getState().reset()
            }}
          >
            New tournament
          </button>
        </div>
      </div>
    </div>
  )
}
