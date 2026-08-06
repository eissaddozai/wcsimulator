import NumberFlow from '@number-flow/react'
import { Check, Crown, Dices, Lock, Search, SlidersHorizontal, Swords } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '../../components/Flag'
import { HostPicker } from '../../components/HostPicker'
import { PlayoffTournament } from '../../components/PlayoffTournament'
import { TeamStudio } from '../../components/TeamStudio'
import { CONFEDS, NATIONS, NATION_BY_ID, byConfed, shortName } from '../../data/nations'
import { starOf } from '../../engine/campaign'
import { playoffState, playoff64State } from '../../engine/playoffs'
import { QUAL_MODES } from '../../engine/qualification'
import {
  canAdd,
  canAddPlayoff,
  directTotalFor,
  fieldSizeFor,
  playoffAllocationFor,
  playoffEntrantsFor,
  quotaStatus,
  quotasFor,
} from '../../engine/selection'
import { useStore } from '../../store/store'
import type { Confed, Format } from '../../engine/types'

export function SelectionScreen() {
  const entries = useStore((s) => s.entries)
  const playoffTeams = useStore((s) => s.playoffTeams)
  const playoffResults = useStore((s) => s.playoffResults)
  const toggleTeam = useStore((s) => s.toggleTeam)
  const togglePlayoffTeam = useStore((s) => s.togglePlayoffTeam)
  const simulate = useStore((s) => s.simulateQualificationAction)
  const clearTeams = useStore((s) => s.clearTeams)
  const chaos = useStore((s) => s.chaos)
  const setChaos = useStore((s) => s.setChaos)
  const playoffLog = useStore((s) => s.playoffLog)
  const setStep = useStore((s) => s.setStep)
  const reseedPots = useStore((s) => s.reseedPots)
  const hosts = useStore((s) => s.hosts)
  const hostsChosen = useStore((s) => s.hostsChosen)
  const format = useStore((s) => s.format)
  const setFormat = useStore((s) => s.setFormat)
  const qualMode = useStore((s) => s.qualMode)
  const setQualMode = useStore((s) => s.setQualMode)

  const [tab, setTab] = useState<Confed>('UEFA')
  const [query, setQuery] = useState('')
  const [hostPickerOpen, setHostPickerOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [poOpen, setPoOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const size = fieldSizeFor(format)
  const directTotal = directTotalFor(format)
  const entrantTarget = playoffEntrantsFor(format)
  const winnersNeeded = format === 64 ? 4 : 2
  const quotas = quotasFor(format)
  const alloc = playoffAllocationFor(format)

  // the very first thing a custom tournament asks: who is hosting?
  useEffect(() => {
    if (!hostsChosen) setHostPickerOpen(true)
  }, [hostsChosen])

  // the moment the last entrant is named, the tournament convenes
  const prevEntrants = useRef(0)
  useEffect(() => {
    if (playoffTeams.length === entrantTarget && prevEntrants.current < entrantTarget) setPoOpen(true)
    prevEntrants.current = playoffTeams.length
  }, [playoffTeams.length, entrantTarget])

  const status = useMemo(() => quotaStatus(entries, hosts, format), [entries, hosts, format])
  const winners = useMemo(
    () =>
      format === 64
        ? (playoff64State(playoffTeams, playoffResults)?.winners ?? [])
        : (playoffState(playoffTeams, playoffResults)?.winners ?? []),
    [playoffTeams, playoffResults, format],
  )
  const poCounts = useMemo(() => {
    const c: Record<Confed, number> = { UEFA: 0, CAF: 0, AFC: 0, CONCACAF: 0, CONMEBOL: 0, OFC: 0 }
    for (const id of playoffTeams) {
      const n = NATION_BY_ID.get(id)
      if (n) c[n.confed]++
    }
    return c
  }, [playoffTeams])

  const simulated = entries.length === size // qualification was simulated — playoffs already resolved
  const ready = simulated || (status.complete && playoffTeams.length === entrantTarget && winners.length === winnersNeeded)

  const list = useMemo(() => {
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      return NATIONS.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)).sort(
        (a, b) => a.rank - b.rank,
      )
    }
    return byConfed(tab)
  }, [tab, query])

  const RING_C = 2 * Math.PI * 44
  const ringTotal = simulated ? size : status.total + playoffTeams.length
  const ringTarget = simulated ? size : directTotal + entrantTarget

  const switchFormat = (f: Format) => {
    if (f === format) return
    const hasProgress = entries.length > hosts.length || playoffTeams.length > 0
    if (hasProgress && !confirm(`Switch to the ${f}-team format? The current field, draw, and scores start over.`)) return
    setFormat(f)
  }

  const whyNot = (): string | null => {
    if (ready) return null
    if (!status.complete) {
      return status.total < directTotal
        ? `Select ${directTotal - status.total} more direct qualifiers — exact quotas per confederation.`
        : 'Direct places must match every confederation quota exactly.'
    }
    if (playoffTeams.length < entrantTarget)
      return `Designate ${entrantTarget - playoffTeams.length} more play-off entrant${entrantTarget - playoffTeams.length === 1 ? '' : 's'} — tap beyond a confederation's quota.`
    return format === 64
      ? 'Play the four Intercontinental Play-offs below — berths 61–64 are still on the pitch.'
      : 'Play the Play-off Tournament below — two places are still on the pitch.'
  }

  return (
    <div className="page">
      <div className="row spread" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <div className="kicker serif-accent">
            {format === 64 ? 'Sixty by right. Four on the pitch.' : 'Forty-six by right. Two on the pitch.'}
          </div>
          <h2 className="display" style={{ fontSize: 34, margin: 0 }}>
            Team Selection
          </h2>
        </div>
        <div className="format-switch" role="radiogroup" aria-label="Tournament format">
          {(
            [
              [48, 'World Cup 26', '12 groups · 104 matches'],
              [64, 'The Expanded 64', '16 groups · 128 matches'],
            ] as [Format, string, string][]
          ).map(([f, name, meta]) => (
            <button
              key={f}
              className={`fmt-opt${format === f ? ' on' : ''}`}
              role="radio"
              aria-checked={format === f}
              onClick={() => switchFormat(f)}
            >
              <span className="fmt-n display tnum">{f}</span>
              <span className="fmt-copy">
                <b>{name}</b>
                <i>{meta}</i>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="selection">
        <aside className="card rail">
          <div className="quota" style={{ gap: 8 }}>
            <div className="row spread">
              <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Crown size={13} className="gold-text" /> Hosts
              </span>
              <button className="btn ghost small" onClick={() => setHostPickerOpen(true)}>
                Change
              </button>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              {hosts.map((h) => (
                <span key={h} className="chip gold">
                  <Flag id={h} size={16} /> {NATION_BY_ID.get(h)?.name}
                </span>
              ))}
            </div>
          </div>
          <div className={`ring-wrap${ready ? ' full' : ''}`}>
            <svg viewBox="0 0 100 100" className="ring" aria-hidden>
              <circle className="ring-bg" cx="50" cy="50" r="44" />
              <circle
                className="ring-fg"
                cx="50"
                cy="50"
                r="44"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - Math.min(ringTotal / ringTarget, 1))}
              />
              {!simulated && (
                <g transform={`rotate(${(directTotal / ringTarget) * 360 - 90} 50 50)`}>
                  <line x1="92" y1="50" x2="100" y2="50" className="ring-tick" />
                </g>
              )}
            </svg>
            <div className="ring-center">
              <div className="ring-num display tnum">
                <NumberFlow value={simulated ? size : status.total + winners.length} />
              </div>
              <div className="ring-cap">of {size} qualified</div>
            </div>
          </div>
          {CONFEDS.map((c) => {
            const base = quotas[c]
            const count = status.counts[c]
            return (
              <div key={c} className="quota">
                <div className="row spread">
                  <span className="muted">{c}</span>
                  <span className="tnum low">
                    {count} / {base}
                    {alloc[c] > 0 && !simulated && (
                      <span className={poCounts[c] > 0 ? 'gold-text' : ''} title="Play-off entrants">
                        {' '}
                        · PO {poCounts[c]}/{alloc[c]}
                      </span>
                    )}
                  </span>
                </div>
                <div className="meter" role="img" aria-label={`${c}: ${count} of ${base} direct`}>
                  {Array.from({ length: base }, (_, i) => (
                    <i key={i} className={i < Math.min(count, base) ? 'fill' : ''} />
                  ))}
                  {count > base &&
                    Array.from({ length: count - base }, (_, i) => (
                      <i key={`w${i}`} className="over" title="Play-off winner — earned on the pitch" />
                    ))}
                  {!simulated &&
                    Array.from({ length: alloc[c] }, (_, i) => (
                      <i key={`p${i}`} className={i < poCounts[c] ? 'po-fill' : 'po-slot'} />
                    ))}
                </div>
              </div>
            )
          })}
          <div className="low" style={{ fontSize: 12 }}>
            {simulated
              ? 'Qualification simulated — the play-off places were settled on the pitch.'
              : format === 64
                ? 'Sixteen overflow picks enter four Intercontinental Play-offs — UEFA sends four, Oceania one. Each tournament sends one nation through.'
                : 'Six overflow picks enter the FIFA Play-off Tournament — two win the last places. UEFA never enters.'}
          </div>
          <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="qual-rail" role="radiogroup" aria-label="Qualifying modality">
              <span className="qr-end">chalk</span>
              <div className="qual-modes">
                {QUAL_MODES.map((m) => (
                  <button
                    key={m.id}
                    className={`qm-chip${qualMode === m.id ? ' on' : ''}`}
                    role="radio"
                    aria-checked={qualMode === m.id}
                    title={m.blurb}
                    onClick={() => setQualMode(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              <span className="qr-end">anarchy</span>
            </div>
            <div className="low" style={{ fontSize: 10.5, marginTop: -4 }}>
              {QUAL_MODES.find((m) => m.id === qualMode)?.blurb}
            </div>
            <button className="btn gold-line" onClick={simulate}>
              <Dices size={16} /> Simulate qualification
            </button>
            <label className="low" style={{ fontSize: 12 }}>
              Chaos — {chaosLabel(chaos.qualification)}
              <input
                className="chaos-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(chaos.qualification * 50)}
                onChange={(e) => setChaos('qualification', Number(e.target.value) / 50)}
                aria-label="Qualification chaos"
              />
            </label>
            <button className="btn ghost small" onClick={() => setStudioOpen(true)}>
              <SlidersHorizontal size={13} /> Team studio — ratings & boosters
            </button>
            <button className="btn ghost small" onClick={clearTeams}>
              Clear picks
            </button>
          </div>
          {playoffLog.length > 0 && (
            <div className="playoff-log">
              {playoffLog.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          )}
        </aside>

        <section>
          <div className="row spread" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="seg" role="tablist" aria-label="Confederations">
              {CONFEDS.map((c) => (
                <button
                  key={c}
                  role="tab"
                  className={`${tab === c && !query ? 'on' : ''}${status.counts[c] === quotas[c] ? ' filled' : ''}`}
                  onClick={() => { setTab(c); setQuery('') }}
                >
                  <i
                    className="tab-ring"
                    aria-hidden
                    style={{
                      background: `conic-gradient(var(--gold) ${Math.min(status.counts[c] / Math.max(quotas[c], 1), 1) * 360}deg, var(--line-2) 0)`,
                    }}
                  />
                  {c}
                  <span className={`seg-count tnum${status.counts[c] === quotas[c] ? ' full' : ''}`}>
                    {status.counts[c]}/{quotas[c]}
                  </span>
                </button>
              ))}
            </div>
            <label className="search-pill row" style={{ gap: 8 }}>
              <Search size={15} className="low" />
              <input
                ref={searchRef}
                className="search-in"
                placeholder="Search all nations…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              />
              <kbd className="key-hint">/</kbd>
            </label>
          </div>

          {!simulated && playoffTeams.length === 0 && (
            <div className="po-band card ghost-band">
              <div className="po-band-info">
                <span className="po-title" style={{ justifyContent: 'flex-start' }}>
                  {format === 64 ? 'Intercontinental Play-offs' : 'FIFA Play-off Tournament'}
                </span>
                <span className="low" style={{ fontSize: 12 }}>
                  Tap beyond a confederation's quota to name play-off entrants — {entrantTarget} contest the last{' '}
                  {winnersNeeded} places on the pitch.
                </span>
              </div>
              <button className="btn small gold-line" disabled>
                <Swords size={14} /> Awaiting entrants
              </button>
            </div>
          )}
          {!simulated && playoffTeams.length > 0 && (
            <div className="po-band card">
              <div className="po-band-info">
                <span className="po-title" style={{ justifyContent: 'flex-start' }}>
                  {format === 64 ? 'Intercontinental Play-offs · four tournaments' : 'FIFA Play-off Tournament'}
                </span>
                <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                  {playoffTeams.map((id) => (
                    <Flag key={id} id={id} size={20} />
                  ))}
                  <span className="low" style={{ fontSize: 12, marginLeft: 6 }}>
                    {playoffTeams.length < entrantTarget
                      ? `${playoffTeams.length} of ${entrantTarget} entrants — keep tapping beyond the quotas`
                      : winners.length === winnersNeeded
                        ? `Settled — ${winners.map((w) => shortName(w)).join(', ')} qualified`
                        : `${entrantTarget} entrants named — ${winnersNeeded} places on the pitch`}
                  </span>
                </span>
              </div>
              <button
                className={`btn small ${playoffTeams.length === entrantTarget && winners.length < winnersNeeded ? 'primary' : 'gold-line'}`}
                disabled={playoffTeams.length < entrantTarget}
                onClick={() => setPoOpen(true)}
              >
                <Swords size={14} /> {winners.length === winnersNeeded ? 'Review the tournament' : 'Enter the tournament'}
              </button>
            </div>
          )}

          <div className="team-grid">
            {list.map((n) => {
              const on = entries.includes(n.id)
              const isPO = playoffTeams.includes(n.id)
              const isHost = hosts.includes(n.id)
              const addCheck = on || isPO ? { ok: true, reason: null } : canAdd(entries, hosts, n.id, format)
              const poCheck = on || isPO ? { ok: true, reason: null } : canAddPlayoff(entries, playoffTeams, n.id, format)
              const clickable = on || isPO || addCheck.ok || poCheck.ok
              const hint = !clickable ? (addCheck.reason ?? poCheck.reason) : !on && !isPO && !addCheck.ok ? 'Becomes a play-off entrant' : null
              return (
                <button
                  key={n.id}
                  className={`card team-card${on ? ' on' : ''}${isPO ? ' po' : ''}`}
                  disabled={!clickable}
                  title={hint ?? undefined}
                  onClick={() => {
                    if (isHost) return
                    if (on) toggleTeam(n.id)
                    else if (isPO) togglePlayoffTeam(n.id)
                    else if (addCheck.ok) toggleTeam(n.id)
                    else if (poCheck.ok) togglePlayoffTeam(n.id)
                  }}
                  aria-pressed={on || isPO}
                >
                  {on && (
                    <span className="pick-check" aria-hidden>
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                  {isPO && (
                    <span className="pick-check po" aria-hidden title="Play-off entrant">
                      P
                    </span>
                  )}
                  <Flag id={n.id} size={26} ringed={on} />
                  <span className="nm-wrap">
                    <span className="name">
                      {query.trim()
                        ? (() => {
                            const q = query.trim().toLowerCase()
                            const idx = n.name.toLowerCase().indexOf(q)
                            if (idx < 0) return n.name
                            return (
                              <>
                                {n.name.slice(0, idx)}
                                <mark>{n.name.slice(idx, idx + q.length)}</mark>
                                {n.name.slice(idx + q.length)}
                              </>
                            )
                          })()
                        : n.name}
                    </span>
                    <i className="power" style={{ width: `${Math.min(Math.max((n.rating - 1000) / 1150, 0.04), 1) * 100}%` }} />
                  </span>
                  {starOf(n.id) > 0.55 && (
                    <span className="star-mark" role="img" aria-label="Carries a world-class talisman" title="Carries a world-class talisman">
                      ★
                    </span>
                  )}
                  {isHost ? <Lock size={12} className="gold-text" aria-label="Host — locked in" /> : (
                    <span className="rank tnum">#{n.rank}</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div className="footerbar">
        {!ready && <span className="why">{whyNot()}</span>}
        <button
          className="btn primary"
          disabled={!ready}
          onClick={() => {
            reseedPots()
            setStep('pots')
          }}
        >
          Continue to Pots
        </button>
      </div>

      {hostPickerOpen && <HostPicker onClose={() => setHostPickerOpen(false)} />}
      {studioOpen && <TeamStudio onClose={() => setStudioOpen(false)} />}
      {poOpen && playoffTeams.length === entrantTarget && <PlayoffTournament onClose={() => setPoOpen(false)} />}
    </div>
  )
}

function chaosLabel(theta: number): string {
  if (theta < 0.34) return 'Chalk'
  if (theta < 0.9) return 'Mostly sensible'
  if (theta < 1.4) return 'Real-world upsets'
  return 'Anarchy'
}
