import NumberFlow from '@number-flow/react'
import { Check, Crown, Dices, Lock, Search, SlidersHorizontal, Swords } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '../../components/Flag'
import { HostPicker } from '../../components/HostPicker'
import { PlayoffTournament } from '../../components/PlayoffTournament'
import { TeamStudio } from '../../components/TeamStudio'
import { BASE_QUOTA, CONFEDS, NATIONS, NATION_BY_ID, byConfed, shortName } from '../../data/nations'
import { playoffState } from '../../engine/playoffs'
import { PLAYOFF_ALLOCATION, canAdd, canAddPlayoff, quotaStatus } from '../../engine/selection'
import { useStore } from '../../store/store'
import type { Confed } from '../../engine/types'

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

  const [tab, setTab] = useState<Confed>('UEFA')
  const [query, setQuery] = useState('')
  const [hostPickerOpen, setHostPickerOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [poOpen, setPoOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // the very first thing a custom tournament asks: who is hosting?
  useEffect(() => {
    if (!hostsChosen) setHostPickerOpen(true)
  }, [hostsChosen])

  // the moment the sixth entrant is named, the tournament convenes
  const prevEntrants = useRef(0)
  useEffect(() => {
    if (playoffTeams.length === 6 && prevEntrants.current < 6) setPoOpen(true)
    prevEntrants.current = playoffTeams.length
  }, [playoffTeams.length])

  const status = useMemo(() => quotaStatus(entries, hosts), [entries, hosts])
  const po = useMemo(() => playoffState(playoffTeams, playoffResults), [playoffTeams, playoffResults])
  const poCounts = useMemo(() => {
    const c: Record<Confed, number> = { UEFA: 0, CAF: 0, AFC: 0, CONCACAF: 0, CONMEBOL: 0, OFC: 0 }
    for (const id of playoffTeams) {
      const n = NATION_BY_ID.get(id)
      if (n) c[n.confed]++
    }
    return c
  }, [playoffTeams])

  const simulated = entries.length === 48 // qualification was simulated — playoffs already resolved
  const winners = po?.winners ?? []
  const ready = simulated || (status.complete && playoffTeams.length === 6 && winners.length === 2)

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
  const ringTotal = simulated ? 48 : status.total + playoffTeams.length
  const ringTarget = simulated ? 48 : 52 // 46 direct + 6 entrants

  const whyNot = (): string | null => {
    if (ready) return null
    if (!status.complete) {
      return status.total < 46
        ? `Select ${46 - status.total} more direct qualifiers — exact quotas per confederation.`
        : 'Direct places must match every confederation quota exactly.'
    }
    if (playoffTeams.length < 6)
      return `Designate ${6 - playoffTeams.length} more play-off entrant${6 - playoffTeams.length === 1 ? '' : 's'} — tap beyond a confederation's quota.`
    return 'Play the Play-off Tournament below — two places are still on the pitch.'
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div className="kicker serif-accent">Forty-six by right. Two on the pitch.</div>
        <h2 className="display" style={{ fontSize: 34, margin: 0 }}>
          Team Selection
        </h2>
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
            </svg>
            <div className="ring-center">
              <div className="ring-num display tnum">
                <NumberFlow value={simulated ? 48 : status.total + winners.length} />
              </div>
              <div className="ring-cap">of 48 qualified</div>
            </div>
          </div>
          {CONFEDS.map((c) => {
            const base = BASE_QUOTA[c]
            const count = status.counts[c]
            const alloc = PLAYOFF_ALLOCATION[c]
            return (
              <div key={c} className="quota">
                <div className="row spread">
                  <span className="muted">{c}</span>
                  <span className="tnum low">
                    {count} / {base}
                    {alloc > 0 && !simulated && (
                      <span className={poCounts[c] > 0 ? 'gold-text' : ''} title="Play-off Tournament entrants">
                        {' '}
                        · PO {poCounts[c]}/{alloc}
                      </span>
                    )}
                  </span>
                </div>
                <div className="meter" role="img" aria-label={`${c}: ${count} of ${base} direct`}>
                  {Array.from({ length: base }, (_, i) => (
                    <i key={i} className={i < Math.min(count, base) ? 'fill' : ''} />
                  ))}
                  {!simulated &&
                    Array.from({ length: alloc }, (_, i) => (
                      <i key={`p${i}`} className={i < poCounts[c] ? 'po-fill' : 'po-slot'} style={{ maxWidth: 6 }} />
                    ))}
                </div>
              </div>
            )
          })}
          <div className="low" style={{ fontSize: 12 }}>
            {simulated
              ? 'Qualification simulated — the play-off places were settled on the pitch.'
              : 'Six overflow picks enter the FIFA Play-off Tournament — two win the last places. UEFA never enters.'}
          </div>
          <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                <button key={c} role="tab" className={tab === c && !query ? 'on' : ''} onClick={() => { setTab(c); setQuery('') }}>
                  {c}
                </button>
              ))}
            </div>
            <label className="row" style={{ gap: 8 }}>
              <Search size={16} className="low" />
              <input
                ref={searchRef}
                className="search-in"
                placeholder="Search all nations…  ( / )"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              />
            </label>
          </div>

          {!simulated && playoffTeams.length > 0 && (
            <div className="po-band card">
              <div className="po-band-info">
                <span className="po-title" style={{ justifyContent: 'flex-start' }}>
                  FIFA Play-off Tournament
                </span>
                <span className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                  {playoffTeams.map((id) => (
                    <Flag key={id} id={id} size={20} />
                  ))}
                  <span className="low" style={{ fontSize: 12, marginLeft: 6 }}>
                    {playoffTeams.length < 6
                      ? `${playoffTeams.length} of 6 entrants — keep tapping beyond the quotas`
                      : winners.length === 2
                        ? `Settled — ${winners.map((w) => shortName(w)).join(' and ')} qualified`
                        : 'Six entrants named — two places on the pitch'}
                  </span>
                </span>
              </div>
              <button
                className={`btn small ${playoffTeams.length === 6 && winners.length < 2 ? 'primary' : 'gold-line'}`}
                disabled={playoffTeams.length < 6}
                onClick={() => setPoOpen(true)}
              >
                <Swords size={14} /> {winners.length === 2 ? 'Review the tournament' : 'Enter the tournament'}
              </button>
            </div>
          )}

          <div className="team-grid">
            {list.map((n) => {
              const on = entries.includes(n.id)
              const isPO = playoffTeams.includes(n.id)
              const isHost = hosts.includes(n.id)
              const addCheck = on || isPO ? { ok: true, reason: null } : canAdd(entries, hosts, n.id)
              const poCheck = on || isPO ? { ok: true, reason: null } : canAddPlayoff(entries, playoffTeams, n.id)
              const clickable = on || isPO || addCheck.ok || poCheck.ok
              const hint = !clickable ? (addCheck.reason ?? poCheck.reason) : !on && !isPO && !addCheck.ok ? 'Becomes a Play-off Tournament entrant' : null
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
                    <span className="pick-check po" aria-hidden title="Play-off Tournament entrant">
                      P
                    </span>
                  )}
                  <Flag id={n.id} size={26} ringed={on} />
                  <span className="nm-wrap">
                    <span className="name">{n.name}</span>
                    <i className="power" style={{ width: `${Math.min(Math.max((n.rating - 1000) / 1150, 0.04), 1) * 100}%` }} />
                  </span>
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
      {poOpen && playoffTeams.length === 6 && <PlayoffTournament onClose={() => setPoOpen(false)} />}
    </div>
  )
}

function chaosLabel(theta: number): string {
  if (theta < 0.34) return 'Chalk'
  if (theta < 0.9) return 'Mostly sensible'
  if (theta < 1.4) return 'Real-world upsets'
  return 'Anarchy'
}
