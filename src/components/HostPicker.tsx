import { Dices, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Flag } from './Flag'
import { NATIONS, NATION_BY_ID } from '../data/nations'
import { drawSurpriseHosts, useStore } from '../store/store'

const PRESET_PACKS: { label: string; hosts: string[] }[] = [
  { label: 'North America 2026', hosts: ['MEX', 'CAN', 'USA'] },
  { label: 'Iberia–Morocco 2030', hosts: ['ESP', 'POR', 'MAR'] },
  { label: 'Saudi Arabia 2034', hosts: ['KSA'] },
  { label: 'Brazil solo', hosts: ['BRA'] },
]

/**
 * Asked at the beginning of every custom tournament: who is hosting?
 * Pick one to three nations — or let the simulator decide. Hosts auto-qualify,
 * take Pot 1, anchor Groups A/B/D in order, and carry home advantage in every match.
 */
export function HostPicker({ onClose }: { onClose: () => void }) {
  const hosts = useStore((s) => s.hosts)
  const setHosts = useStore((s) => s.setHosts)
  const markHostsChosen = useStore((s) => s.markHostsChosen)
  const [picked, setPicked] = useState<string[]>(hosts)
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? NATIONS.filter((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
      : NATIONS.slice().sort((a, b) => a.rank - b.rank).slice(0, 60)
    return base.slice(0, 60)
  }, [query])

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p))
  }

  const confirm = () => {
    if (picked.length === 0) return
    setHosts(picked)
    markHostsChosen()
    onClose()
  }

  const anchorLabel = ['opens Group A', 'opens Group B', 'opens Group D']

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Choose the hosts">
      <div className="dialog" style={{ maxWidth: 560, maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}>
        <div className="row spread">
          <h3 className="display" style={{ margin: 0, fontSize: 26 }}>
            Who's hosting?
          </h3>
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <p className="muted" style={{ margin: '4px 0 12px' }}>
          Pick one to three host nations — they qualify automatically, seed into Pot 1, anchor Groups A, B and D, and
          enjoy home advantage in every match. Or let the simulator decide.
        </p>

        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {PRESET_PACKS.map((p) => (
            <button key={p.label} className="chip" style={{ height: 28, cursor: 'pointer' }} onClick={() => setPicked(p.hosts)}>
              {p.hosts.map((h) => (
                <Flag key={h} id={h} size={16} />
              ))}
              {p.label}
            </button>
          ))}
          <button
            className="chip gold"
            style={{ height: 28, cursor: 'pointer' }}
            onClick={() => setPicked(drawSurpriseHosts())}
          >
            <Dices size={13} /> Surprise me
          </button>
        </div>

        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <Search size={15} className="low" />
          <input
            className="search-in"
            style={{ flex: 1 }}
            placeholder="Search any of the 211 nations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 180, border: '1px solid var(--line-1)', borderRadius: 8, padding: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
            {list.map((n) => {
              const on = picked.includes(n.id)
              return (
                <button
                  key={n.id}
                  className={`card team-card${on ? ' on' : ''}`}
                  style={{ padding: '6px 10px' }}
                  onClick={() => toggle(n.id)}
                  aria-pressed={on}
                  disabled={!on && picked.length >= 3}
                >
                  <Flag id={n.id} size={20} ringed={on} />
                  <span className="name" style={{ fontSize: 13 }}>
                    {n.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="row" style={{ marginTop: 14, minHeight: 34, flexWrap: 'wrap' }}>
          {picked.map((id, i) => (
            <span key={id} className="chip gold">
              <Flag id={id} size={16} /> {NATION_BY_ID.get(id)?.name}
              <span className="low">· {anchorLabel[i]}</span>
            </span>
          ))}
          {picked.length === 0 && <span className="low">Every World Cup needs at least one host.</span>}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={picked.length === 0} onClick={confirm}>
            Confirm hosts
          </button>
        </div>
      </div>
    </div>
  )
}
