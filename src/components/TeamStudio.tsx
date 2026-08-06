import { RotateCcw, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Flag } from './Flag'
import { NATION_BY_ID, overrideOf, rankOf, ratingOf } from '../data/nations'
import { BOOSTERS, MAX_BOOSTERS_PER_TEAM, type Booster } from '../engine/boosters'
import { useStore } from '../store/store'

const GROUP_ORDER: Booster['group'][] = ['Attack', 'Defense', 'Mentality', 'Physical', 'Fortune', 'Burden']

/**
 * The Team Studio: once the 48 are chosen, tune any nation's world ranking and rating,
 * and hand out boosters — manually assignable modifiers that feed the match model.
 */
export function TeamStudio({ onClose }: { onClose: () => void }) {
  const entries = useStore((s) => s.entries)
  const ratingOverrides = useStore((s) => s.ratingOverrides)
  const setNationOverride = useStore((s) => s.setNationOverride)
  const clearAllOverrides = useStore((s) => s.clearAllOverrides)
  const [open, setOpen] = useState<string | null>(null)

  const sorted = useMemo(() => entries.slice().sort((a, b) => rankOf(a) - rankOf(b)), [entries, ratingOverrides])
  const touched = Object.keys(ratingOverrides).length

  const patch = (id: string, p: { rank?: number; rating?: number; boosts?: string[] }) => {
    const cur = overrideOf(id) ?? {}
    setNationOverride(id, { ...cur, ...p })
  }

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Team studio">
      <div className="dialog studio" style={{ maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div className="row spread">
          <h3 className="display" style={{ margin: 0, fontSize: 26 }}>
            Team Studio
          </h3>
          <div className="row">
            {touched > 0 && (
              <button className="btn ghost small" onClick={clearAllOverrides}>
                <RotateCcw size={13} /> Reset all ({touched})
              </button>
            )}
            <button className="btn icon ghost" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>
        <p className="muted" style={{ margin: '4px 0 12px' }}>
          Rewrite any nation's world ranking and rating, and hand out up to {MAX_BOOSTERS_PER_TEAM} boosters — they
          feed straight into seeding, odds, and every simulated minute.
        </p>

        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--line-1)', borderRadius: 8 }}>
          {sorted.map((id) => {
            const n = NATION_BY_ID.get(id)
            if (!n) return null
            const o = ratingOverrides[id]
            const boosts = o?.boosts ?? []
            const expanded = open === id
            return (
              <div key={id} className="studio-row-wrap">
                <div className="studio-row">
                  <Flag id={id} size={24} />
                  <span className="name">
                    {n.name}
                    {o && <span className="gold-text" title="Modified"> ●</span>}
                  </span>
                  <label className="low">
                    rank
                    <input
                      className="studio-in tnum"
                      inputMode="numeric"
                      value={rankOf(id)}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(/[^0-9]/g, ''))
                        if (v >= 1 && v <= 211) patch(id, { rank: v })
                      }}
                      aria-label={`${n.name} world ranking`}
                    />
                  </label>
                  <label className="low">
                    rating
                    <input
                      className="studio-in tnum"
                      inputMode="numeric"
                      value={ratingOf(id)}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(/[^0-9]/g, ''))
                        if (v >= 800 && v <= 2400) patch(id, { rating: v })
                      }}
                      aria-label={`${n.name} rating`}
                    />
                  </label>
                  <button
                    className={`btn small${boosts.length > 0 ? ' gold-line' : ' ghost'}`}
                    onClick={() => setOpen(expanded ? null : id)}
                    aria-expanded={expanded}
                  >
                    <Sparkles size={13} /> {boosts.length > 0 ? `${boosts.length} boost${boosts.length > 1 ? 's' : ''}` : 'Boosters'}
                  </button>
                  {o && (
                    <button className="btn icon ghost" title="Reset" onClick={() => setNationOverride(id, null)}>
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
                {expanded && (
                  <div className="booster-panel">
                    {GROUP_ORDER.map((grp) => (
                      <div key={grp}>
                        <div className="booster-group-label">{grp}</div>
                        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                          {BOOSTERS.filter((b) => b.group === grp).map((b) => {
                            const on = boosts.includes(b.id)
                            const full = !on && boosts.length >= MAX_BOOSTERS_PER_TEAM
                            return (
                              <button
                                key={b.id}
                                className={`booster-chip${on ? ' on' : ''}${b.group === 'Burden' ? ' burden' : ''}`}
                                title={b.blurb}
                                disabled={full}
                                aria-pressed={on}
                                onClick={() =>
                                  patch(id, { boosts: on ? boosts.filter((x) => x !== b.id) : [...boosts, b.id] })
                                }
                              >
                                {b.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {sorted.length === 0 && (
            <p className="muted" style={{ padding: 24, textAlign: 'center' }}>
              Pick some teams first — the studio edits your chosen 48.
            </p>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
