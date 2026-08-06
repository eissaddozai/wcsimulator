import { FlaskConical, RotateCcw, X } from 'lucide-react'
import { DEFAULT_MODEL, type ModelParams } from '../engine/simulate'
import { useStore } from '../store/store'

interface SliderSpec {
  key: keyof ModelParams
  label: string
  blurb: string
  min: number
  max: number
  step: number
  format: (v: number) => string
}

const SLIDERS: SliderSpec[] = [
  {
    key: 'homeBoost',
    label: 'Host advantage',
    blurb: 'Elo points a host nation gains on home soil.',
    min: 0,
    max: 120,
    step: 5,
    format: (v) => `+${v}`,
  },
  {
    key: 'tempo',
    label: 'Goal tempo',
    blurb: 'Global multiplier on total goals — 1990s slog to basketball.',
    min: 0.7,
    max: 1.5,
    step: 0.05,
    format: (v) => `×${v.toFixed(2)}`,
  },
  {
    key: 'edgeWeight',
    label: 'Favorite bite',
    blurb: 'How hard rating differences translate into dominance.',
    min: 0.3,
    max: 1.0,
    step: 0.02,
    format: (v) => v.toFixed(2),
  },
  {
    key: 'drawiness',
    label: 'Draw correction',
    blurb: 'Dixon–Coles low-score coupling — 0 kills the extra 0-0s and 1-1s.',
    min: 0,
    max: 2,
    step: 0.1,
    format: (v) => `×${v.toFixed(1)}`,
  },
  {
    key: 'tension',
    label: 'Stage tension',
    blurb: 'How much knockout rounds tighten (and the bronze game opens up).',
    min: 0,
    max: 2,
    step: 0.1,
    format: (v) => `×${v.toFixed(1)}`,
  },
  {
    key: 'fatigueImpact',
    label: 'Fatigue impact',
    blurb: 'The toll of extra time and shootouts on the next round.',
    min: 0,
    max: 2,
    step: 0.1,
    format: (v) => `×${v.toFixed(1)}`,
  },
  {
    key: 'styleInfluence',
    label: 'Style contrast',
    blurb: 'How much attacking/defensive identities skew scorelines.',
    min: 0,
    max: 2,
    step: 0.1,
    format: (v) => `×${v.toFixed(1)}`,
  },
]

/** The Model Lab: live sliders over the simulation engine's parameters. */
export function ModelLab({ onClose }: { onClose: () => void }) {
  const modelParams = useStore((s) => s.modelParams)
  const setModelParam = useStore((s) => s.setModelParam)
  const resetModelParams = useStore((s) => s.resetModelParams)
  const touched = Object.keys(modelParams).length > 0

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Model lab">
      <div className="dialog" style={{ maxWidth: 480 }}>
        <div className="row spread">
          <h3 className="display" style={{ margin: 0, fontSize: 26, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical size={20} className="gold-text" /> Model Lab
          </h3>
          <div className="row">
            {touched && (
              <button className="btn ghost small" onClick={resetModelParams}>
                <RotateCcw size={13} /> Defaults
              </button>
            )}
            <button className="btn icon ghost" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>
        <p className="muted" style={{ margin: '4px 0 16px' }}>
          These sliders re-calibrate the simulation engine itself — every future simulated match, odds readout, and
          dice roll obeys them instantly.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SLIDERS.map((sl) => {
            const value = modelParams[sl.key] ?? DEFAULT_MODEL[sl.key]
            const isDefault = value === DEFAULT_MODEL[sl.key]
            return (
              <label key={sl.key} className="lab-slider">
                <span className="row spread">
                  <span style={{ fontWeight: 600 }}>
                    {sl.label}
                    {!isDefault && <span className="gold-text"> ●</span>}
                  </span>
                  <span className="tnum gold-text" style={{ fontSize: 13 }}>
                    {sl.format(value)}
                  </span>
                </span>
                <input
                  className="chaos-slider"
                  type="range"
                  min={sl.min}
                  max={sl.max}
                  step={sl.step}
                  value={value}
                  onChange={(e) => setModelParam(sl.key, Number(e.target.value))}
                  aria-label={sl.label}
                />
                <span className="low" style={{ fontSize: 11 }}>
                  {sl.blurb}
                </span>
              </label>
            )
          })}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
