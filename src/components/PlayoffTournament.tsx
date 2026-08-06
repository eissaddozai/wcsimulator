import confetti from 'canvas-confetti'
import { Dices, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Flag } from './Flag'
import { ScoreInput } from './ScoreInput'
import { NATION_BY_ID, rankOf } from '../data/nations'
import { WEATHER_LABEL, matchEnvironment } from '../engine/environment'
import { playoffState, playoff64State, type PlayoffMatchKey, type Playoff64Key } from '../engine/playoffs'
import { detailedOdds, koWinner } from '../engine/simulate'
import { useStore, type PlayoffKey } from '../store/store'
import { isScored, type MatchResult } from '../engine/types'

/** Canonical match numbers — the Play-off Tournament precedes Match 1. */
const PO_NUMBER: Record<PlayoffMatchKey, number> = { sf1: 105, sf2: 106, f1: 107, f2: 108 }
const PO_LABEL: Record<PlayoffMatchKey, string> = {
  sf1: 'Semifinal 1',
  sf2: 'Semifinal 2',
  f1: 'Final 1',
  f2: 'Final 2',
}

/** Env-seed numbers for the four Intercontinental Play-off tournaments (post-final range). */
const PO64_NUMBER: Record<Playoff64Key, number> = {
  'a-sf1': 131, 'a-sf2': 132, 'a-f': 133,
  'b-sf1': 134, 'b-sf2': 135, 'b-f': 136,
  'c-sf1': 137, 'c-sf2': 138, 'c-f': 139,
  'd-sf1': 140, 'd-sf2': 141, 'd-f': 142,
}

function venueLine(hosts: readonly string[]): string {
  if (hosts.includes('MEX')) return 'Guadalajara & Monterrey · March 2026'
  const first = hosts[0] ? NATION_BY_ID.get(hosts[0])?.name : null
  return first ? `Hosted in ${first} · March 2026` : 'March 2026'
}

export function PlayoffTournament({ onClose }: { onClose: () => void }) {
  const format = useStore((s) => s.format)
  return format === 64 ? <Playoff64 onClose={onClose} /> : <Playoff48 onClose={onClose} />
}

/**
 * The FIFA Play-off Tournament as a ceremony of its own: six entrants, real seedings,
 * venues in the host country, weather per match, odds, and two golden tickets.
 */
function Playoff48({ onClose }: { onClose: () => void }) {
  const playoffTeams = useStore((s) => s.playoffTeams)
  const playoffResults = useStore((s) => s.playoffResults)
  const simulatePlayoffMatch = useStore((s) => s.simulatePlayoffMatch)
  const hosts = useStore((s) => s.hosts)
  const po = useMemo(() => playoffState(playoffTeams, playoffResults), [playoffTeams, playoffResults])

  const celebrated = useRef(false)
  useEffect(() => {
    if (!po || po.winners.length < 2 || celebrated.current) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    celebrated.current = true
    confetti({
      particleCount: 80,
      spread: 90,
      startVelocity: 36,
      origin: { y: 0.4 },
      colors: ['#e5c87f', '#d2b064', '#f2efe6'],
      scalar: 0.9,
      zIndex: 90,
    })
  }, [po])

  if (!po) return null
  const done = po.winners.length === 2

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal
      aria-label="FIFA Play-off Tournament"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog po-dialog">
        <button className="btn icon ghost host-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="po-hero">
          <div className="kicker serif-accent">The last dance of qualification</div>
          <h3 className="display" style={{ fontSize: 30, margin: 0 }}>
            FIFA Play-off Tournament
          </h3>
          <div className="po-venue tnum">{venueLine(hosts)}</div>
          <p className="low" style={{ margin: '6px auto 0', maxWidth: 460, fontSize: 12.5 }}>
            Six entrants. The two best-ranked wait in the finals; the other four meet in one-off
            semifinals. Win your final and you're at the World Cup.
          </p>
        </div>
        <div className="po-scroll">
          <div className="po-field">
            {[...playoffTeams]
              .sort((a, b) => rankOf(a) - rankOf(b))
              .map((id, i) => (
                <span key={id} className={`po-entrant${i < 2 ? ' seeded' : ''}`} title={NATION_BY_ID.get(id)?.name}>
                  <Flag id={id} size={20} />
                  <span className="pe-name">{NATION_BY_ID.get(id)?.name}</span>
                  <span className="pe-tag tnum">{i < 2 ? `SEED ${i + 1}` : `#${rankOf(id)}`}</span>
                </span>
              ))}
          </div>
          <div className="po-grid2">
            <div className="po-stage">① Semifinals — one-off ties</div>
            <div />
            <div className="po-stage">② Finals — winner qualifies</div>
            <PlayoffMatchCard k="sf1" home={po.sf1[0]} away={po.sf1[1]} label={PO_LABEL.sf1} matchNo={PO_NUMBER.sf1} />
            <div className="po-arrow" aria-hidden>
              <i />
            </div>
            <PlayoffMatchCard k="f1" home={po.f1[0]} away={po.f1[1]} label={PO_LABEL.f1} matchNo={PO_NUMBER.f1} seeded />
            <PlayoffMatchCard k="sf2" home={po.sf2[0]} away={po.sf2[1]} label={PO_LABEL.sf2} matchNo={PO_NUMBER.sf2} />
            <div className="po-arrow" aria-hidden>
              <i />
            </div>
            <PlayoffMatchCard k="f2" home={po.f2[0]} away={po.f2[1]} label={PO_LABEL.f2} matchNo={PO_NUMBER.f2} seeded />
          </div>
          {po.winners.length > 0 && (
            <div className="po-qualified">
              {po.winners.map((id) => (
                <span key={id} className="chip gold">
                  <Flag id={id} size={16} /> {NATION_BY_ID.get(id)?.name} — qualified for the World Cup
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="po-foot">
          {!done ? (
            <>
              <span className="low" style={{ fontSize: 12 }}>
                {2 - po.winners.length} place{po.winners.length === 1 ? '' : 's'} still on the pitch
              </span>
              <button
                className="btn gold-line small"
                onClick={() => {
                  for (const k of ['sf1', 'sf2', 'f1', 'f2'] as PlayoffMatchKey[]) {
                    const cur = playoffState(useStore.getState().playoffTeams, useStore.getState().playoffResults)
                    if (!cur) return
                    const [h, a] = cur[k]
                    if (h && a && !useStore.getState().playoffResults[k]) simulatePlayoffMatch(k)
                  }
                }}
              >
                <Dices size={14} /> Simulate the tournament
              </button>
            </>
          ) : (
            <span className="gold-text display" style={{ fontSize: 15, letterSpacing: '0.06em' }}>
              The forty-eight are complete.
            </span>
          )}
          <button className="btn small" onClick={onClose}>
            {done ? 'Return to selection' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

const PO64_KEYS: Playoff64Key[] = [
  'a-sf1', 'a-sf2', 'a-f',
  'b-sf1', 'b-sf2', 'b-f',
  'c-sf1', 'c-sf2', 'c-f',
  'd-sf1', 'd-sf2', 'd-f',
]

/**
 * The Intercontinental Play-offs of the 64-team format: sixteen entrants, four
 * three-match tournaments, berths 61–64 — every confederation designation on show.
 */
function Playoff64({ onClose }: { onClose: () => void }) {
  const playoffTeams = useStore((s) => s.playoffTeams)
  const playoffResults = useStore((s) => s.playoffResults)
  const simulatePlayoffMatch = useStore((s) => s.simulatePlayoffMatch)
  const hosts = useStore((s) => s.hosts)
  const po = useMemo(() => playoff64State(playoffTeams, playoffResults), [playoffTeams, playoffResults])

  const celebrated = useRef(false)
  useEffect(() => {
    if (!po || po.winners.length < 4 || celebrated.current) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    celebrated.current = true
    confetti({
      particleCount: 110,
      spread: 100,
      startVelocity: 38,
      origin: { y: 0.4 },
      colors: ['#e5c87f', '#d2b064', '#f2efe6'],
      scalar: 0.9,
      zIndex: 90,
    })
  }, [po])

  const designationOf = useMemo(() => {
    const m = new Map<string, string>()
    if (po) {
      for (const [confed, ids] of Object.entries(po.designation)) {
        ids.forEach((id, i) => m.set(id, `${confed} ${i + 1}`))
      }
    }
    return m
  }, [po])

  if (!po) return null
  const done = po.winners.length === 4

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal
      aria-label="Intercontinental Play-offs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog po-dialog po-dialog-64">
        <button className="btn icon ghost host-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="po-hero">
          <div className="kicker serif-accent">Four tournaments. Four golden tickets.</div>
          <h3 className="display" style={{ fontSize: 30, margin: 0 }}>
            Intercontinental Play-offs
          </h3>
          <div className="po-venue tnum">{venueLine(hosts)}</div>
          <p className="low" style={{ margin: '6px auto 0', maxWidth: 520, fontSize: 12.5 }}>
            Sixteen entrants, designated Team 1–3 of their confederation by world ranking, drawn into
            four tournaments so no two compatriots can meet. Each tournament plays two one-off
            semifinals and a final — the winner takes one of berths 61–64.
          </p>
        </div>
        <div className="po-scroll">
          <div className="po-field">
            {[...playoffTeams]
              .sort((a, b) => rankOf(a) - rankOf(b))
              .map((id) => (
                <span key={id} className="po-entrant" title={NATION_BY_ID.get(id)?.name}>
                  <Flag id={id} size={20} />
                  <span className="pe-name">{NATION_BY_ID.get(id)?.name}</span>
                  <span className="pe-tag tnum">{designationOf.get(id) ?? `#${rankOf(id)}`}</span>
                </span>
              ))}
          </div>
          <div className="po64-tournaments">
            {po.tournaments.map((t) => {
              const lo = t.id.toLowerCase()
              return (
                <section key={t.id} className={`po64-t${t.winner ? ' settled' : ''}`}>
                  <header className="po64-head">
                    <span className="po64-letter display">{t.id}</span>
                    <span className="po64-title">
                      Play-off Tournament {t.id}
                      <i>Berth {t.berth}</i>
                    </span>
                    {t.winner && (
                      <span className="chip gold" style={{ marginLeft: 'auto' }}>
                        <Flag id={t.winner} size={15} /> {NATION_BY_ID.get(t.winner)?.name}
                      </span>
                    )}
                  </header>
                  <div className="po-grid2">
                    <div className="po-stage">① Semifinals</div>
                    <div />
                    <div className="po-stage">② Final — berth {t.berth}</div>
                    <PlayoffMatchCard
                      k={`${lo}-sf1` as Playoff64Key}
                      home={t.sf1[0]}
                      away={t.sf1[1]}
                      label="Semifinal 1"
                      matchNo={PO64_NUMBER[`${lo}-sf1` as Playoff64Key]}
                      tags={designationOf}
                    />
                    <div className="po-arrow" aria-hidden>
                      <i />
                    </div>
                    <PlayoffMatchCard
                      k={`${lo}-f` as Playoff64Key}
                      home={t.f[0]}
                      away={t.f[1]}
                      label={`Final ${t.id}`}
                      matchNo={PO64_NUMBER[`${lo}-f` as Playoff64Key]}
                      tags={designationOf}
                    />
                    <PlayoffMatchCard
                      k={`${lo}-sf2` as Playoff64Key}
                      home={t.sf2[0]}
                      away={t.sf2[1]}
                      label="Semifinal 2"
                      matchNo={PO64_NUMBER[`${lo}-sf2` as Playoff64Key]}
                      tags={designationOf}
                    />
                    <div className="po-arrow" aria-hidden>
                      <i />
                    </div>
                    <div />
                  </div>
                </section>
              )
            })}
          </div>
          {po.winners.length > 0 && (
            <div className="po-qualified">
              {po.winners.map((id) => (
                <span key={id} className="chip gold">
                  <Flag id={id} size={16} /> {NATION_BY_ID.get(id)?.name} — qualified for the World Cup
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="po-foot">
          {!done ? (
            <>
              <span className="low" style={{ fontSize: 12 }}>
                {4 - po.winners.length} berth{po.winners.length === 3 ? '' : 's'} still on the pitch
              </span>
              <button
                className="btn gold-line small"
                onClick={() => {
                  for (const k of PO64_KEYS) {
                    if (!useStore.getState().playoffResults[k]) simulatePlayoffMatch(k)
                  }
                }}
              >
                <Dices size={14} /> Simulate all four tournaments
              </button>
            </>
          ) : (
            <span className="gold-text display" style={{ fontSize: 15, letterSpacing: '0.06em' }}>
              The sixty-four are complete.
            </span>
          )}
          <button className="btn small" onClick={onClose}>
            {done ? 'Return to selection' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PlayoffMatchCard({
  k,
  home,
  away,
  label,
  matchNo,
  seeded = false,
  tags,
}: {
  k: PlayoffKey
  home: string | null
  away: string | null
  label: string
  matchNo: number
  seeded?: boolean
  tags?: Map<string, string>
}) {
  const r = useStore((s) => s.playoffResults[k]) ?? null
  const setPlayoffResult = useStore((s) => s.setPlayoffResult)
  const simulatePlayoffMatch = useStore((s) => s.simulatePlayoffMatch)
  const chaos = useStore((s) => s.chaos)
  const masterSeed = useStore((s) => s.masterSeed)

  const env = useMemo(() => matchEnvironment(masterSeed, matchNo), [masterSeed, matchNo])
  const odds = useMemo(
    () => (home && away ? detailedOdds(home, away, { stage: 'r32' }, chaos.match) : null),
    [home, away, chaos.match],
  )

  const commit = (patch: Partial<MatchResult>) => {
    if (!home || !away) return
    const base: MatchResult = r ?? { score: { home: null, away: null } }
    const next: MatchResult = { ...base, ...patch }
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
    setPlayoffResult(k, next)
  }

  const decided = r && home && away ? koWinner(home, away, r) : null
  const level90 = r ? isScored(r) && r.score.home === r.score.away : false
  const needsPens = level90 && r?.et !== undefined && r.et.home !== null && r.et.home === r.et.away
  const note = r?.pens
    ? `pens ${r.pens.home ?? '·'}–${r.pens.away ?? '·'}`
    : r?.et && r.et.home !== null && r.et.home !== r.et.away
      ? 'aet'
      : null

  const teamRow = (id: string | null, winner: boolean, score: string) => (
    <div className={`pom-side${winner ? ' winner' : ''}`}>
      {id ? (
        <>
          <Flag id={id} size={24} />
          <span className="pom-name" title={NATION_BY_ID.get(id)?.name}>
            {NATION_BY_ID.get(id)?.name}
          </span>
          <span className="pom-rank tnum low">{tags?.get(id) ?? `#${rankOf(id)}`}</span>
        </>
      ) : (
        <span className="low pom-tbd">Semifinal winner</span>
      )}
      <span className="score tnum">{score}</span>
    </div>
  )

  const hs = r && r.score.home !== null ? String(r.score.home + (r.et?.home ?? 0)) : ''
  const as_ = r && r.score.away !== null ? String(r.score.away + (r.et?.away ?? 0)) : ''

  return (
    <div className={`card pom${decided ? ' done' : ''}${!home || !away ? ' waiting' : ''}`}>

      {seeded && <span className="po-bye">seed</span>}
      <div className="pom-head">
        <span className="mtag">
          <i className="mdot" />
          {label}
        </span>
        <span className="mnum tnum">Match {matchNo}</span>
        <span className={`env-chip wx-${env.weather}`} style={{ marginLeft: 'auto' }}>
          {WEATHER_LABEL[env.weather]} · {env.tempC}°C
        </span>
      </div>
      {teamRow(home, decided !== null && decided === home, hs)}
      {teamRow(away, decided !== null && decided === away, as_)}
      {note && (
        <span className={`verdict${note.startsWith('pens') ? ' pens' : ' aet'}`}>
          {note.startsWith('pens') ? (
            <>
              <i className="v-ball" />
              Penalties <b className="tnum">{note.slice(5)}</b>
            </>
          ) : (
            'After extra time'
          )}
        </span>
      )}
      {odds && (
        <div className="pom-odds" title="Chance to advance">
          <i style={{ width: `${Math.round(odds.advHome * 100)}%` }} />
          <span className="tnum">{Math.round(odds.advHome * 100)}%</span>
          <span className="tnum right">{Math.round(odds.advAway * 100)}%</span>
        </div>
      )}
      {home && away && (
        <div className="pom-controls">
          <ScoreInput
            small
            label={`${home} goals`}
            value={r?.score.home ?? null}
            onCommit={(v) => commit({ score: { home: v, away: r?.score.away ?? null } })}
          />
          <span className="low tnum">–</span>
          <ScoreInput
            small
            label={`${away} goals`}
            value={r?.score.away ?? null}
            onCommit={(v) => commit({ score: { home: r?.score.home ?? null, away: v } })}
          />
          <button className="dice-btn" onClick={() => simulatePlayoffMatch(k)} title="Simulate (ET and penalties included)">
            <Dices size={14} />
          </button>
          {r && (
            <button className="dice-btn" onClick={() => setPlayoffResult(k, null)} title="Clear">
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      )}
      {level90 && r && home && away && (
        <div className="pom-extra low">
          level after 90′
          <ScoreInput
            small
            label="home extra time"
            value={r.et?.home ?? null}
            onCommit={(v) => commit({ et: { home: v, away: r.et?.away ?? null } })}
          />
          ET
          <ScoreInput
            small
            label="away extra time"
            value={r.et?.away ?? null}
            onCommit={(v) => commit({ et: { home: r.et?.home ?? null, away: v } })}
          />
        </div>
      )}
      {needsPens && r && home && away && (
        <div className="pom-extra low">
          shoot-out
          <ScoreInput
            small
            label="home penalties"
            value={r.pens?.home ?? null}
            onCommit={(v) => commit({ pens: { home: v, away: r.pens?.away ?? null } })}
          />
          –
          <ScoreInput
            small
            label="away penalties"
            value={r.pens?.away ?? null}
            onCommit={(v) => commit({ pens: { home: r.pens?.home ?? null, away: v } })}
          />
        </div>
      )}
    </div>
  )
}
