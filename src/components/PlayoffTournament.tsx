import confetti from 'canvas-confetti'
import { Dices, RotateCcw, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Flag } from './Flag'
import { ScoreInput } from './ScoreInput'
import { NATION_BY_ID, rankOf } from '../data/nations'
import { WEATHER_LABEL, matchEnvironment } from '../engine/environment'
import { playoffState, type PlayoffMatchKey } from '../engine/playoffs'
import { detailedOdds, koWinner } from '../engine/simulate'
import { useStore } from '../store/store'
import { isScored, type MatchResult } from '../engine/types'

/** Canonical match numbers — the Play-off Tournament precedes Match 1. */
const PO_NUMBER: Record<PlayoffMatchKey, number> = { sf1: 105, sf2: 106, f1: 107, f2: 108 }
const PO_LABEL: Record<PlayoffMatchKey, string> = {
  sf1: 'Semifinal 1',
  sf2: 'Semifinal 2',
  f1: 'Final 1',
  f2: 'Final 2',
}

function venueLine(hosts: readonly string[]): string {
  if (hosts.includes('MEX')) return 'Guadalajara & Monterrey · March 2026'
  const first = hosts[0] ? NATION_BY_ID.get(hosts[0])?.name : null
  return first ? `Hosted in ${first} · March 2026` : 'March 2026'
}

/**
 * The FIFA Play-off Tournament as a ceremony of its own: six entrants, real seedings,
 * venues in the host country, weather and referees per match, odds, and two golden tickets.
 */
export function PlayoffTournament({ onClose }: { onClose: () => void }) {
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
            <PlayoffMatchCard k="sf1" home={po.sf1[0]} away={po.sf1[1]} />
            <div className="po-arrow" aria-hidden>
              <i />
            </div>
            <PlayoffMatchCard k="f1" home={po.f1[0]} away={po.f1[1]} seeded />
            <PlayoffMatchCard k="sf2" home={po.sf2[0]} away={po.sf2[1]} />
            <div className="po-arrow" aria-hidden>
              <i />
            </div>
            <PlayoffMatchCard k="f2" home={po.f2[0]} away={po.f2[1]} seeded />
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

function PlayoffMatchCard({
  k,
  home,
  away,
  seeded = false,
}: {
  k: PlayoffMatchKey
  home: string
  away: string | null
  seeded?: boolean
}) {
  const r = useStore((s) => s.playoffResults[k]) ?? null
  const setPlayoffResult = useStore((s) => s.setPlayoffResult)
  const simulatePlayoffMatch = useStore((s) => s.simulatePlayoffMatch)
  const chaos = useStore((s) => s.chaos)
  const masterSeed = useStore((s) => s.masterSeed)

  const env = useMemo(() => matchEnvironment(masterSeed, PO_NUMBER[k]), [masterSeed, k])
  const odds = useMemo(
    () => (away ? detailedOdds(home, away, { stage: 'r32' }, chaos.match) : null),
    [home, away, chaos.match],
  )

  const commit = (patch: Partial<MatchResult>) => {
    if (!away) return
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

  const decided = r && away ? koWinner(home, away, r) : null
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
          <span className="pom-rank tnum low">#{rankOf(id)}</span>
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
    <div className={`card pom${decided ? ' done' : ''}${!away ? ' waiting' : ''}`}>

      {seeded && <span className="po-bye">seed</span>}
      <div className="pom-head">
        <span className="mtag">
          <i className="mdot" />
          {PO_LABEL[k]}
        </span>
        <span className="mnum tnum">Match {PO_NUMBER[k]}</span>
        <span className={`env-chip wx-${env.weather}`} style={{ marginLeft: 'auto' }}>
          {WEATHER_LABEL[env.weather]} · {env.tempC}°C
        </span>
      </div>
      {teamRow(home, decided === home, hs)}
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
      {away && (
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
      {level90 && r && away && (
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
      {needsPens && r && away && (
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
