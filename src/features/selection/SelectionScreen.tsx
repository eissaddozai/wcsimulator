import NumberFlow from '@number-flow/react'
import { Check, Crown, Dices, Lock, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from '../../components/Flag'
import { HostPicker } from '../../components/HostPicker'
import { TeamStudio } from '../../components/TeamStudio'
import { BASE_QUOTA, CONFEDS, FLEX_SLOTS, NATIONS, NATION_BY_ID, byConfed } from '../../data/nations'
import { canAdd, quotaStatus } from '../../engine/selection'
import { useStore } from '../../store/store'
import type { Confed } from '../../engine/types'

export function SelectionScreen() {
  const entries = useStore((s) => s.entries)
  const toggleTeam = useStore((s) => s.toggleTeam)
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
  const searchRef = useRef<HTMLInputElement>(null)

  // the very first thing a custom tournament asks: who is hosting?
  useEffect(() => {
    if (!hostsChosen) setHostPickerOpen(true)
  }, [hostsChosen])

  const status = useMemo(() => quotaStatus(entries, hosts), [entries, hosts])

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

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div className="kicker serif-accent">Seven confederations. Forty-eight places.</div>
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
          <div className={`ring-wrap${status.complete ? ' full' : ''}`}>
            <svg viewBox="0 0 100 100" className="ring" aria-hidden>
              <circle className="ring-bg" cx="50" cy="50" r="44" />
              <circle
                className="ring-fg"
                cx="50"
                cy="50"
                r="44"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - Math.min(status.total / 48, 1))}
              />
            </svg>
            <div className="ring-center">
              <div className="ring-num display tnum">
                <NumberFlow value={status.total} />
              </div>
              <div className="ring-cap">of 48 selected</div>
            </div>
          </div>
          {CONFEDS.map((c) => {
            const base = BASE_QUOTA[c]
            const count = status.counts[c]
            const flexHere = c === 'UEFA' ? 0 : Math.max(0, count - base)
            return (
              <div key={c} className="quota">
                <div className="row spread">
                  <span className="muted">{c}</span>
                  <span className="tnum low">
                    {count} / {base}
                    {c !== 'UEFA' && <span title="may take an inter-confederation playoff slot"> +flex</span>}
                  </span>
                </div>
                <div className="meter" role="img" aria-label={`${c}: ${count} of ${base} selected`}>
                  {Array.from({ length: base }, (_, i) => (
                    <i key={i} className={i < Math.min(count, base) ? 'fill' : ''} />
                  ))}
                  {c !== 'UEFA' && <i className={flexHere >= 1 ? 'flex-fill' : 'flex-slot'} style={{ maxWidth: 6 }} />}
                  {c !== 'UEFA' && <i className={flexHere >= 2 ? 'flex-fill' : 'flex-slot'} style={{ maxWidth: 6 }} />}
                </div>
              </div>
            )
          })}
          <div className="low" style={{ fontSize: 12 }}>
            {FLEX_SLOTS - status.flexUsed} of {FLEX_SLOTS} inter-confederation playoff slots free — UEFA never takes
            one.
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

          <div className="team-grid">
            {list.map((n) => {
              const on = entries.includes(n.id)
              const isHost = hosts.includes(n.id)
              const addCheck = on ? { ok: true, reason: null } : canAdd(entries, hosts, n.id)
              return (
                <button
                  key={n.id}
                  className={`card team-card${on ? ' on' : ''}`}
                  disabled={!on && !addCheck.ok}
                  title={!on && addCheck.reason ? addCheck.reason : undefined}
                  onClick={() => !isHost && toggleTeam(n.id)}
                  aria-pressed={on}
                >
                  {on && (
                    <span className="pick-check" aria-hidden>
                      <Check size={11} strokeWidth={3} />
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
        {!status.complete && (
          <span className="why">
            {status.total < 48
              ? `Select ${48 - status.total} more — quotas: UEFA exactly 16, others at least their base allocation.`
              : 'Selection does not meet confederation quotas yet.'}
          </span>
        )}
        <button
          className="btn primary"
          disabled={!status.complete}
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
    </div>
  )
}

function chaosLabel(theta: number): string {
  if (theta < 0.34) return 'Chalk'
  if (theta < 0.9) return 'Mostly sensible'
  if (theta < 1.4) return 'Real-world upsets'
  return 'Anarchy'
}
