import { Dices, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Flag } from './Flag'
import { NATIONS, NATION_BY_ID, ratingOf } from '../data/nations'
import { drawSurpriseHosts, useStore } from '../store/store'

/** Real bids and famous pairings — one tap installs the whole pack. */
const HOST_PACKS: { label: string; sub: string; hosts: string[] }[] = [
  { label: 'North America 2026', sub: 'The real trio', hosts: ['MEX', 'CAN', 'USA'] },
  { label: 'Iberia–Morocco 2030', sub: 'The real 2030 hosts', hosts: ['ESP', 'POR', 'MAR'] },
  { label: 'Centenario 2030', sub: 'Where it all began', hosts: ['ARG', 'URU', 'PAR'] },
  { label: 'Saudi Arabia 2034', sub: 'The 2034 host', hosts: ['KSA'] },
  { label: 'East Asia', sub: '2002 revisited', hosts: ['JPN', 'KOR'] },
  { label: 'Down Under', sub: "Oceania's stage", hosts: ['AUS', 'NZL'] },
  { label: 'Home Nations', sub: 'UK & Ireland bid', hosts: ['ENG', 'SCO', 'WAL'] },
  { label: 'Nordic Summer', sub: 'Midnight-sun football', hosts: ['SWE', 'NOR', 'DEN'] },
]

/** Nations that could plausibly stage a 48-team World Cup tomorrow. */
const SUGGESTED_SINGLES = [
  'BRA', 'GER', 'ESP', 'ENG', 'FRA', 'ITA', 'ARG', 'USA', 'MEX',
  'JPN', 'NED', 'POR', 'MAR', 'KSA', 'AUS', 'TUR', 'RSA', 'KOR', 'QAT', 'CHN',
]

function hostBadge(id: string): string {
  const r = ratingOf(id)
  if (r >= 1990) return 'Superpower stage'
  if (r >= 1820) return 'Proven host'
  if (r >= 1650) return 'Rising bid'
  return 'Ambitious bid'
}

const ANCHORS = ['A', 'B', 'D'] as const

/**
 * Asked at the beginning of every custom tournament: who is hosting?
 * Suggested nations and real bid packs up front, the anchor tray making the
 * consequences visible — or hand the choice to the simulator.
 */
export function HostPicker({ onClose }: { onClose: () => void }) {
  const hosts = useStore((s) => s.hosts)
  const setHosts = useStore((s) => s.setHosts)
  const markHostsChosen = useStore((s) => s.markHostsChosen)
  const [picked, setPicked] = useState<string[]>(hosts)
  const [query, setQuery] = useState('')

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return NATIONS.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)).slice(0, 12)
  }, [query])

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : [...p.slice(0, 2), id]))
  }

  const confirm = () => {
    if (picked.length === 0) return
    setHosts(picked)
    markHostsChosen()
    onClose()
  }

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Choose the hosts">
      <div className="dialog host-dialog">
        <button className="btn icon ghost host-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="host-hero">
          <div className="serif-accent gold-text" style={{ fontSize: 16 }}>
            First question of every World Cup
          </div>
          <h3 className="display" style={{ margin: 0, fontSize: 40, lineHeight: 1 }}>
            Who's hosting?
          </h3>
          <p className="muted" style={{ margin: '6px auto 0', maxWidth: 480 }}>
            Hosts qualify automatically, seed into Pot 1, anchor the marquee groups, and carry the crowd in every
            match. Pick up to three — or let fate decide.
          </p>
        </div>

        <div className="host-scroll">
          <div className="host-section-label">Real bids & famous pairings</div>
          <div className="host-pack-row">
            {HOST_PACKS.map((p) => {
              const on = p.hosts.length === picked.length && p.hosts.every((h) => picked.includes(h))
              return (
                <button key={p.label} className={`host-pack${on ? ' on' : ''}`} onClick={() => setPicked(p.hosts)}>
                  <span className="flag-stack">
                    {p.hosts.map((h, i) => (
                      <span key={h} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }}>
                        <Flag id={h} size={26} />
                      </span>
                    ))}
                  </span>
                  <span className="display" style={{ fontSize: 15, lineHeight: 1.1 }}>
                    {p.label}
                  </span>
                  <span className="low" style={{ fontSize: 10 }}>
                    {p.sub}
                  </span>
                </button>
              )
            })}
            <button className="host-pack surprise" onClick={() => setPicked(drawSurpriseHosts())}>
              <span className="flag-stack">
                <span className="mystery-disc">
                  <Dices size={16} />
                </span>
              </span>
              <span className="display" style={{ fontSize: 15, lineHeight: 1.1 }}>
                Surprise me
              </span>
              <span className="low" style={{ fontSize: 10 }}>
                The simulator decides
              </span>
            </button>
          </div>

          <div className="host-section-label">Suggested nations</div>
          <div className="host-singles">
            {SUGGESTED_SINGLES.map((id) => {
              const on = picked.includes(id)
              return (
                <button key={id} className={`host-single${on ? ' on' : ''}`} onClick={() => toggle(id)} aria-pressed={on}>
                  <Flag id={id} size={30} ringed={on} />
                  <span>
                    <span className="hs-name">{NATION_BY_ID.get(id)?.name}</span>
                    <span className="hs-sub low">{hostBadge(id)}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="host-section-label row" style={{ gap: 8 }}>
            <Search size={12} /> Or any of the 211
          </div>
          <input
            className="search-in"
            style={{ width: '100%' }}
            placeholder="Search any nation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="host-singles" style={{ marginTop: 8 }}>
              {searchResults.map((n) => {
                const on = picked.includes(n.id)
                return (
                  <button key={n.id} className={`host-single${on ? ' on' : ''}`} onClick={() => toggle(n.id)} aria-pressed={on}>
                    <Flag id={n.id} size={30} ringed={on} />
                    <span>
                      <span className="hs-name">{n.name}</span>
                      <span className="hs-sub low">{hostBadge(n.id)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="host-tray">
          {ANCHORS.map((g, i) => {
            const id = picked[i]
            return (
              <div key={g} className={`anchor-slot${id ? ' filled' : ''}`}>
                {id ? (
                  <>
                    <Flag id={id} size={34} ringed />
                    <span className="as-name display">{NATION_BY_ID.get(id)?.name}</span>
                    <span className="as-sub low">opens Group {g}</span>
                    <button className="as-remove" onClick={() => toggle(id)} aria-label={`Remove ${id}`}>
                      <X size={11} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="as-ghost tnum">{g}1</span>
                    <span className="as-sub low">{i === 0 ? 'at least one host' : 'optional co-host'}</span>
                  </>
                )}
              </div>
            )
          })}
          <button className="btn primary" style={{ marginLeft: 'auto', minWidth: 170 }} disabled={picked.length === 0} onClick={confirm}>
            Confirm hosts
          </button>
        </div>
      </div>
    </div>
  )
}
