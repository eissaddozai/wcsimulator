import { FlaskConical, RotateCcw, X } from 'lucide-react'
import { DEFAULT_MODEL } from '../engine/simulate'
import { useStore } from '../store/store'
import { LAB_GROUPS, type SliderSpec } from './labSpecs'

export function LabSlider({ sl }: { sl: SliderSpec }) {
  const modelParams = useStore((s) => s.modelParams)
  const setModelParam = useStore((s) => s.setModelParam)
  const value = modelParams[sl.key] ?? DEFAULT_MODEL[sl.key]
  const isDefault = value === DEFAULT_MODEL[sl.key]
  return (
    <label className="lab-slider">
      <span className="row spread">
        <span style={{ fontWeight: 600, fontSize: 13 }}>
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
}

/** Compact modal over the full 26-domain engine — the Laboratory page shows the same dials expanded. */
export function ModelLab({ onClose }: { onClose: () => void }) {
  const modelParams = useStore((s) => s.modelParams)
  const resetModelParams = useStore((s) => s.resetModelParams)
  const touched = Object.keys(modelParams).length > 0

  return (
    <div className="overlay" role="dialog" aria-modal aria-label="Model lab">
      <div className="dialog" style={{ maxWidth: 520, maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}>
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
        <p className="muted" style={{ margin: '4px 0 12px' }}>
          Twenty-six live dials over the simulation engine — the full Laboratory sits in the main flow, this is the
          pocket version.
        </p>
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 18, paddingRight: 4 }}>
          {LAB_GROUPS.map((g) => (
            <div key={g.title}>
              <div className={`lab-group-label tint-${g.tint}`}>{g.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {g.items.map((sl) => (
                  <LabSlider key={sl.key} sl={sl} />
                ))}
              </div>
            </div>
          ))}
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
