import { Crown, Dices, FlaskConical, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '../../components/Flag'
import { MatchTheater } from '../../components/MatchTheater'
import { ModelLab } from '../../components/ModelLab'
import { ScoreInput } from '../../components/ScoreInput'
import { TournamentPulse } from '../../components/TournamentPulse'
import { NATION_BY_ID, shortName } from '../../data/nations'
import { WEATHER_LABEL, matchEnvironment } from '../../engine/environment'
import { matchRecap } from '../../engine/narrative'
import type { ResolvedKo } from '../../engine/bracket'
import { KO_BY_NUMBER, KO_MATCHES } from '../../engine/schedule'
import { detailedOdds, koWinner, stageOfMatch, type MatchContext } from '../../engine/simulate'
import { allGroupsComplete, bracketState } from '../../engine/tournament'
import { groupsOf, useStore } from '../../store/store'
import type { KoSource, MatchEvent, MatchResult } from '../../engine/types'

/**
 * True mirrored bracket: two wings converging on a center Final column.
 * One CSS grid, 16 rows; node cells span 2/4/8/16 rows so every round centers on its
 * feeders, with elbow connectors drawn between columns — the champion's road turns gold.
 */
const LEFT = {
  r32: [74, 77, 73, 75, 83, 84, 81, 82],
  r16: [89, 90, 93, 94],
  qf: [97, 98],
  sf: [101],
}
const RIGHT = {
  r32: [76, 78, 79, 80, 86, 88, 85, 87],
  r16: [91, 92, 95, 96],
  qf: [99, 100],
  sf: [102],
}

function sourceLabel(src: KoSource): string {
  switch (src.kind) {
    case 'winner':
      return `1${src.group}`
    case 'runnerUp':
      return `2${src.group}`
    case 'third':
      return `3rd ${src.cands.join('/')}`
    case 'matchWinner':
      return `W${src.match}`
    case 'matchLoser':
      return `L${src.match}`
  }
}

export function KnockoutScreen() {
  const drawTrace = useStore((s) => s.drawTrace)
  const results = useStore((s) => s.results)
  const masterSeed = useStore((s) => s.masterSeed)
  const simulateKoMatch = useStore((s) => s.simulateKoMatch)
  const [openMatch, setOpenMatch] = useState<number | null>(null)
  const [showChampion, setShowChampion] = useState(true)

  const groups = useMemo(() => groupsOf(drawTrace), [drawTrace])
  const complete = allGroupsComplete(results)
  const state = useMemo(
    () => (groups ? bracketState(groups, results, masterSeed) : null),
    [groups, results, masterSeed],
  )

  if (!groups || !state) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 96 }}>
        <p className="muted">Run the draw and play the groups first.</p>
      </div>
    )
  }

  const bracket = state.bracket
  const champion = bracket[104]?.winner ?? null
  const finalMatch = bracket[104]

  const node = (n: number, row: string, col: number, compact = false) => (
    <div key={n} style={{ gridRow: row, gridColumn: col, display: 'flex', alignItems: 'center', minWidth: 0 }}>
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
        <h2 className="display" style={{ fontSize: 32, margin: 0 }}>
          Knockout Stage
        </h2>
        {!complete && (
          <span className="chip">Awaiting the group stage — the wings fill once all 72 scores are entered</span>
        )}
        {complete && (
          <button
            className="btn small gold-line"
            onClick={() => {
              for (const m of KO_MATCHES) {
                const cur = useStore.getState()
                const gs = groupsOf(cur.drawTrace)!
                const st = bracketState(gs, cur.results, cur.masterSeed)
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

      <div className="bracket-wrap">
        <div className="bracket2">
          {/* round headers */}
          <div className="bhead" style={{ gridColumn: 1 }}>Round of 32</div>
          <div className="bhead" style={{ gridColumn: 3 }}>Round of 16</div>
          <div className="bhead" style={{ gridColumn: 5 }}>Quarterfinal</div>
          <div className="bhead" style={{ gridColumn: 7 }}>Semifinal</div>
          <div className="bhead gold-text" style={{ gridColumn: 9 }}>Final</div>
          <div className="bhead" style={{ gridColumn: 11 }}>Semifinal</div>
          <div className="bhead" style={{ gridColumn: 13 }}>Quarterfinal</div>
          <div className="bhead" style={{ gridColumn: 15 }}>Round of 16</div>
          <div className="bhead" style={{ gridColumn: 17 }}>Round of 32</div>

          {/* left wing */}
          {LEFT.r32.map((n, i) => node(n, `${2 * i + 2} / span 2`, 1, true))}
          {LEFT.r16.map((n, j) => [conn(n, `${4 * j + 2} / span 4`, 2, 'l'), node(n, `${4 * j + 2} / span 4`, 3)])}
          {LEFT.qf.map((n, k) => [conn(n, `${8 * k + 2} / span 8`, 4, 'l'), node(n, `${8 * k + 2} / span 8`, 5)])}
          {LEFT.sf.map((n) => [conn(n, `2 / span 16`, 6, 'l'), node(n, `2 / span 16`, 7)])}
          {conn(104, `2 / span 16`, 8, 'l', true)}

          {/* center: champion, final, bronze */}
          <div className="bcenter" style={{ gridRow: '2 / span 16', gridColumn: 9 }}>
            <div className="champ-slot">
              {champion ? (
                <>
                  <Flag id={champion} size={64} ringed />
                  <div className="display gold-text" style={{ fontSize: 26, lineHeight: 1 }}>
                    {NATION_BY_ID.get(champion)?.name}
                  </div>
                  <div className="low" style={{ fontSize: 11, letterSpacing: '0.14em' }}>CHAMPIONS</div>
                </>
              ) : (
                <>
                  <div className="champ-ghost">
                    <Crown size={26} />
                  </div>
                  <div className="low" style={{ fontSize: 11, letterSpacing: '0.14em' }}>THE TROPHY</div>
                </>
              )}
            </div>
            <KoNode node={bracket[104]!} onOpen={() => setOpenMatch(104)} final />
            <div className="bronze-wrap">
              <div className="low" style={{ fontSize: 10, letterSpacing: '0.14em', marginBottom: 4 }}>BRONZE</div>
              <KoNode node={bracket[103]!} compact onOpen={() => setOpenMatch(103)} />
            </div>
          </div>

          {/* right wing (mirrored) */}
          {conn(104, `2 / span 16`, 10, 'r', true)}
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

      {champion && finalMatch?.result && showChampion && (
        <ChampionScene champion={champion} final={finalMatch} bracket={bracket} onClose={() => setShowChampion(false)} />
      )}
    </div>
  )
}

const STAGE_SHORT: Record<string, string> = { R32: 'R32', R16: 'R16', QF: 'QF', SF: 'SF', THIRD: 'BRZ', FINAL: 'FIN' }

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
  const ko = KO_BY_NUMBER[node.number]!
  const { home: hs, away: as_, note } = scoreText(node)
  const ghost = !node.home || !node.away
  return (
    <button
      className={`card ko-node${ghost ? ' ghost' : ''}${node.winner ? ' done' : ''}${compact ? ' compact' : ''}${final ? ' final-node' : ''}`}
      onClick={onOpen}
      disabled={ghost}
      aria-label={`Match ${node.number}`}
    >
      <span className={`side${node.winner && node.winner === node.home ? ' winner' : ''}`}>
        {node.home ? (
          <>
            <Flag id={node.home} size={compact ? 18 : 22} /> {node.home}
          </>
        ) : (
          <span className="low">{sourceLabel(ko.home)}</span>
        )}
        <span className="score tnum">{hs}</span>
      </span>
      <span className={`side${node.winner && node.winner === node.away ? ' winner' : ''}`}>
        {node.away ? (
          <>
            <Flag id={node.away} size={compact ? 18 : 22} /> {node.away}
          </>
        ) : (
          <span className="low">{sourceLabel(ko.away)}</span>
        )}
        <span className="score tnum">{as_}</span>
      </span>
      <span className="meta">
        <span className={`mtag tnum stage-${ko.stage.toLowerCase()}`}>
          <i className="mdot" />
          {STAGE_SHORT[ko.stage]} · M{node.number}
        </span>
        {node.stale ? (
          <span className="note-badge stale">set aside</span>
        ) : note ? (
          <span className={`note-badge${note.startsWith('pens') ? ' pens' : ''}`}>{note}</span>
        ) : null}
      </span>
    </button>
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
  const [labOpen, setLabOpen] = useState(false)
  const ko = KO_BY_NUMBER[node.number]!
  const r = node.result && !node.stale ? node.result : null
  const home = node.home!
  const away = node.away!

  const ctx: MatchContext = useMemo(
    () => ({
      stage: stageOfMatch(node.number),
      homeHost: hosts.includes(home),
      awayHost: hosts.includes(away),
    }),
    [node.number, home, away, hosts],
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
    } else if (next.et && next.et.home !== null && next.et.home !== next.et.away) {
      delete next.pens
    }
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
          <div className="display low" style={{ fontSize: 14, textAlign: 'center' }}>
            M{node.number}
            <br />
            {ko.stage === 'THIRD' ? 'BRONZE' : ko.stage}
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
              {WEATHER_LABEL[env.weather]} · {env.tempC}°C
            </span>
            <span className="env-chip" title={env.refStrictness > 1.15 ? 'Books everything' : env.refStrictness < 0.9 ? 'Lets play flow' : 'Even-tempered'}>
              Referee {env.refName} ({env.refCountry})
              {env.refStrictness > 1.15 ? ' · strict' : env.refStrictness < 0.9 ? ' · lenient' : ''}
            </span>
          </div>
          <div className="odds-card">
            <div className="row spread" style={{ fontSize: 12, fontWeight: 600 }}>
              <span>
                {shortName(home)} <span className="gold-text tnum">{pct(odds.advHome)}</span>
              </span>
              <span className="low" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                TO ADVANCE
              </span>
              <span>
                <span className="gold-text tnum">{pct(odds.advAway)}</span> {shortName(away)}
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

          {r && r.events && r.events.length > 0 && <MatchTheater r={r} home={home} away={away} />}
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
  const nation = NATION_BY_ID.get(champion)
  const r = final.result!
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = innerWidth
    canvas.height = innerHeight
    const colors = ['#d2b064', '#f2efe6', '#1e5c40']
    const parts = Array.from({ length: 110 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.4,
      vy: 2 + Math.random() * 3,
      vx: -1 + Math.random() * 2,
      s: 4 + Math.random() * 5,
      c: colors[Math.floor(Math.random() * colors.length)]!,
      rot: Math.random() * Math.PI,
    }))
    let frame = 0
    let raf = 0
    const tick = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of parts) {
        p.y += p.vy
        p.x += p.vx
        p.rot += 0.05
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6)
        ctx.restore()
      }
      if (frame < 200) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const road: number[] = []
  for (let n = 73; n <= 104; n++) {
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
        <Flag id={champion} size={96} ringed />
        <h1 className="display">{nation?.name}</h1>
        <div className="scoreline tnum display">
          {NATION_BY_ID.get(final.home!)?.name} {h}–{a} {NATION_BY_ID.get(final.away!)?.name}
          {r.pens ? ` · pens ${r.pens.home}–${r.pens.away}` : r.et ? ' · aet' : ''}
        </div>
        <div className="road">
          {road.map((n) => {
            const m = bracket[n]!
            const opp = m.home === champion ? m.away : m.home
            const won = m.winner === champion
            return (
              <span key={n} className="chip" style={{ borderColor: won ? 'var(--gold-dim)' : 'var(--pos-out)' }}>
                {opp && <Flag id={opp} size={14} />} {opp}
              </span>
            )
          })}
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
