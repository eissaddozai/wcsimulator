import { Dices, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '../../components/Flag'
import { ScoreInput } from '../../components/ScoreInput'
import { NATION_BY_ID } from '../../data/nations'
import type { ResolvedKo } from '../../engine/bracket'
import { KO_BY_NUMBER, KO_MATCHES } from '../../engine/schedule'
import { koWinner } from '../../engine/simulate'
import { allGroupsComplete, bracketState } from '../../engine/tournament'
import { groupsOf, useStore } from '../../store/store'
import type { KoSource, MatchResult } from '../../engine/types'

const ROUNDS: { key: string; label: string; matches: number[] }[] = [
  { key: 'R32', label: 'Round of 32', matches: [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88] },
  { key: 'R16', label: 'Round of 16', matches: [89, 90, 91, 92, 93, 94, 95, 96] },
  { key: 'QF', label: 'Quarterfinals', matches: [97, 98, 99, 100] },
  { key: 'SF', label: 'Semifinals', matches: [101, 102] },
  { key: 'F', label: 'Final & Bronze', matches: [104, 103] },
]

function sourceLabel(src: KoSource): string {
  switch (src.kind) {
    case 'winner':
      return `1${src.group}`
    case 'runnerUp':
      return `2${src.group}`
    case 'third':
      return `3rd of ${src.cands.join('/')}`
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

  return (
    <div className="page">
      <div className="row spread" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
        <h2 className="display" style={{ fontSize: 32, margin: 0 }}>
          Knockout Stage
        </h2>
        {!complete && (
          <span className="chip">Awaiting the group stage — nodes fill in once all 72 scores are entered</span>
        )}
        {complete && (
          <button
            className="btn small gold-line"
            onClick={() => {
              for (const m of KO_MATCHES) {
                const cur = useStore.getState()
                const gs = groupsOf(cur.drawTrace)!
                const st = bracketState(gs, cur.results, cur.masterSeed)
                const node = st.bracket[m.number]!
                if (!node.result && node.home && node.away) simulateKoMatch(m.number)
              }
            }}
          >
            <Dices size={14} /> Simulate remaining
          </button>
        )}
      </div>

      <div className="bracket-wrap">
        <div className="bracket">
          {ROUNDS.map((round) => (
            <div key={round.key} className="round-col">
              <h5>{round.label}</h5>
              {round.matches.map((n) => (
                <KoNode key={n} node={bracket[n]!} onOpen={() => setOpenMatch(n)} />
              ))}
            </div>
          ))}
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
        <ChampionScene
          champion={champion}
          final={finalMatch}
          bracket={bracket}
          onClose={() => setShowChampion(false)}
        />
      )}
    </div>
  )
}

function scoreText(node: ResolvedKo): { home: string; away: string; note: string | null } {
  const r = node.result
  if (!r || node.stale) return { home: '', away: '', note: null }
  const h = r.score.home + (r.et?.home ?? 0)
  const a = r.score.away + (r.et?.away ?? 0)
  let note: string | null = null
  if (r.pens) note = `AET · pens ${r.pens.home}–${r.pens.away}`
  else if (r.et) note = 'AET'
  return { home: String(h), away: String(a), note }
}

function KoNode({ node, onOpen }: { node: ResolvedKo; onOpen: () => void }) {
  const ko = KO_BY_NUMBER[node.number]!
  const { home: hs, away: as_, note } = scoreText(node)
  const ghost = !node.home || !node.away
  return (
    <button
      className={`card ko-node${ghost ? ' ghost' : ''}${node.winner ? ' done' : ''}`}
      onClick={onOpen}
      disabled={ghost}
      aria-label={`Match ${node.number}`}
    >
      <span className={`side${node.winner && node.winner === node.home ? ' winner' : ''}`}>
        {node.home ? (
          <>
            <Flag id={node.home} size={22} /> {node.home}
          </>
        ) : (
          <span className="low">{sourceLabel(ko.home)}</span>
        )}
        <span className="score tnum">{hs}</span>
      </span>
      <span className={`side${node.winner && node.winner === node.away ? ' winner' : ''}`}>
        {node.away ? (
          <>
            <Flag id={node.away} size={22} /> {node.away}
          </>
        ) : (
          <span className="low">{sourceLabel(ko.away)}</span>
        )}
        <span className="score tnum">{as_}</span>
      </span>
      <span className="meta">
        <span className="tnum">
          M{node.number}
          {ko.stage === 'THIRD' ? ' · Bronze' : ko.stage === 'FINAL' ? ' · Final' : ''}
        </span>
        {node.stale ? <span className="stale-chip">set aside</span> : note ? <span>{note}</span> : null}
      </span>
    </button>
  )
}

function MatchPanel({ node, onClose, onDice }: { node: ResolvedKo; onClose: () => void; onDice: () => void }) {
  const setResult = useStore((s) => s.setResult)
  const ko = KO_BY_NUMBER[node.number]!
  const r = node.result && !node.stale ? node.result : null
  const home = node.home!
  const away = node.away!

  const commit = (patch: Partial<MatchResult>) => {
    const base: MatchResult = r ?? { score: { home: 0, away: 0 } }
    const next: MatchResult = { ...base, ...patch, enteredFor: [home, away] }
    // drop decider layers that no longer apply
    if (next.score.home !== next.score.away) {
      delete next.et
      delete next.pens
    } else if (next.et && next.et.home !== next.et.away) {
      delete next.pens
    }
    delete next.simulated
    setResult(node.number, next)
  }

  const level90 = r ? r.score.home === r.score.away : false
  const levelET = r?.et ? r.et.home === r.et.away : false
  const needsPens = level90 && levelET && r?.et !== undefined
  const decided = r ? koWinner(home, away, r) : null

  return (
    <>
      <div className="overlay" style={{ background: 'rgba(4,7,6,0.4)' }} onClick={onClose} />
      <aside className="slideover" aria-label={`Match ${node.number}`}>
        <div className="match-hero">
          <div className="team">
            <Flag id={home} size={64} />
            <span className="nm display">{NATION_BY_ID.get(home)?.name}</span>
          </div>
          <div className="display low" style={{ fontSize: 14, textAlign: 'center' }}>
            M{node.number}
            <br />
            {ko.stage === 'THIRD' ? 'BRONZE' : ko.stage}
          </div>
          <div className="team">
            <Flag id={away} size={64} />
            <span className="nm display">{NATION_BY_ID.get(away)?.name}</span>
          </div>
        </div>
        <div className="match-panel-body">
          <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
            <ScoreInput
              label={`${home} goals`}
              value={r?.score.home ?? null}
              onCommit={(v) => commit({ score: { home: v ?? 0, away: r?.score.away ?? 0 } })}
            />
            <span className="display low" style={{ fontSize: 24 }}>
              –
            </span>
            <ScoreInput
              label={`${away} goals`}
              value={r?.score.away ?? null}
              onCommit={(v) => commit({ score: { home: r?.score.home ?? 0, away: v ?? 0 } })}
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
                  onCommit={(v) => commit({ et: { home: v ?? 0, away: r.et?.away ?? 0 } })}
                />
                <span className="low">ET</span>
                <ScoreInput
                  small
                  label={`${away} extra-time goals`}
                  value={r.et?.away ?? null}
                  onCommit={(v) => commit({ et: { home: r.et?.home ?? 0, away: v ?? 0 } })}
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
                  onCommit={(v) => commit({ pens: { home: v ?? 0, away: r.pens?.away ?? 0 } })}
                />
                <span className="low">pens</span>
                <ScoreInput
                  small
                  label={`${away} penalties`}
                  value={r.pens?.away ?? null}
                  onCommit={(v) => commit({ pens: { home: r.pens?.home ?? 0, away: v ?? 0 } })}
                />
              </div>
              {r.pens && r.pens.home === r.pens.away && (
                <p className="low" style={{ fontSize: 12 }}>
                  A shoot-out needs a winner — adjust one side.
                </p>
              )}
            </div>
          )}

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
  for (const round of [73, 89, 97, 101, 104]) void round
  for (let n = 73; n <= 104; n++) {
    const m = bracket[n]
    if (m && (m.home === champion || m.away === champion)) road.push(n)
  }

  const h = r.score.home + (r.et?.home ?? 0)
  const a = r.score.away + (r.et?.away ?? 0)

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
