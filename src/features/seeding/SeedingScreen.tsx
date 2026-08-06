import { Dices, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Flag } from '../../components/Flag'
import { HOSTS, NATION_BY_ID } from '../../data/nations'
import { validatePots } from '../../engine/draw'
import { STRATEGY_BLURBS, STRATEGY_LABELS } from '../../engine/seeding'
import { useStore } from '../../store/store'
import type { StrategyId } from '../../engine/types'

const STRATEGIES: StrategyId[] = ['official', 'noisy', 'pl-draft', 'form', 'chaos']

export function SeedingScreen() {
  const pots = useStore((s) => s.pots)
  const setPots = useStore((s) => s.setPots)
  const strategy = useStore((s) => s.strategy)
  const setStrategy = useStore((s) => s.setStrategy)
  const reseedPots = useStore((s) => s.reseedPots)
  const chaos = useStore((s) => s.chaos)
  const setChaos = useStore((s) => s.setChaos)
  const setStep = useStore((s) => s.setStep)

  const [drag, setDrag] = useState<{ id: string; pot: number } | null>(null)
  const [over, setOver] = useState<{ id: string; pot: number } | null>(null)

  const check = useMemo(() => (pots ? validatePots(pots) : { ok: false, reason: 'Seed the pots first' }), [pots])

  const move = (fromId: string, toPot: number, toId: string | null) => {
    if (!pots) return
    if (HOSTS.includes(fromId as (typeof HOSTS)[number])) return
    if (toId && HOSTS.includes(toId as (typeof HOSTS)[number])) return
    const next = pots.map((p) => p.slice())
    const fromPot = next.findIndex((p) => p.includes(fromId))
    if (fromPot < 0) return
    const fi = next[fromPot]!.indexOf(fromId)
    if (toId) {
      // swap with the hovered row
      const ti = next[toPot]!.indexOf(toId)
      next[fromPot]![fi] = toId
      next[toPot]![ti] = fromId
    } else if (fromPot !== toPot) {
      return // pots must stay 12/12 — only swaps allowed across pots
    }
    setPots(next)
  }

  return (
    <div className="page">
      <div className="row spread" style={{ flexWrap: 'wrap', gap: 16 }}>
        <h2 className="display" style={{ fontSize: 32, margin: 0 }}>
          Seeding
        </h2>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="seg" role="tablist" aria-label="Seeding strategy">
            {STRATEGIES.map((s) => (
              <button
                key={s}
                className={strategy === s ? 'on' : ''}
                title={STRATEGY_BLURBS[s]}
                onClick={() => {
                  setStrategy(s)
                }}
              >
                {STRATEGY_LABELS[s]}
              </button>
            ))}
          </div>
          {(strategy === 'noisy' || strategy === 'pl-draft' || strategy === 'form') && (
            <label className="row low" style={{ fontSize: 12, gap: 8 }}>
              Chaos
              <input
                className="chaos-slider"
                style={{ width: 120 }}
                type="range"
                min={0}
                max={100}
                value={Math.round(chaos.seeding * 50)}
                onChange={(e) => setChaos('seeding', Number(e.target.value) / 50)}
                aria-label="Seeding chaos"
              />
            </label>
          )}
          <button className="btn gold-line" onClick={reseedPots}>
            <Dices size={16} /> {pots ? 'Re-roll pots' : 'Seed the pots'}
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 4 }}>
        {STRATEGY_BLURBS[strategy]} Hosts stay pinned to Pot 1 — Mexico opens Group A, Canada Group B, the USA Group
        D. Drag any two rows to swap them.
      </p>

      {!check.ok && pots && <div className="linter">{check.reason}</div>}

      {pots && (
        <div className="pots-grid">
          {pots.map((pot, pi) => (
            <div key={pi} className="card pot-col">
              <h3 className="display">
                Pot {pi + 1}
                <span className="tnum low" style={{ fontSize: 13 }}>
                  {pot.length}/12
                </span>
              </h3>
              {pot.map((id) => {
                const n = NATION_BY_ID.get(id)!
                const isHost = HOSTS.includes(id as (typeof HOSTS)[number])
                const dragging = drag?.id === id
                const target = over?.id === id && drag && drag.id !== id
                return (
                  <div
                    key={id}
                    className={`pot-row${dragging ? ' dragging' : ''}${target ? ' drop-target' : ''}`}
                    draggable={!isHost}
                    onDragStart={() => setDrag({ id, pot: pi })}
                    onDragEnd={() => {
                      setDrag(null)
                      setOver(null)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setOver({ id, pot: pi })
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (drag && drag.id !== id) move(drag.id, pi, id)
                      setDrag(null)
                      setOver(null)
                    }}
                  >
                    <span className="grip">⠿</span>
                    <Flag id={id} size={28} />
                    <span className="name">{n.name}</span>
                    {isHost ? <Lock size={12} className="locked" /> : <span className="chip tnum">#{n.rank}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {!pots && (
        <div className="card" style={{ padding: 48, textAlign: 'center', marginTop: 24 }}>
          <p className="muted">Pick a strategy and press “Seed the pots” — every press produces a different world.</p>
        </div>
      )}

      <div className="footerbar">
        {!check.ok && pots && <span className="why">{check.reason}</span>}
        <button className="btn primary" disabled={!check.ok} onClick={() => setStep('draw')}>
          Proceed to the Draw
        </button>
      </div>
    </div>
  )
}
