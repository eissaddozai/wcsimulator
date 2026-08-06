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

/**
 * The pocket Laboratory as a LEFT-side drawer: it docks beside the match panel instead of
 * covering the screen, so every dial you move re-rolls the odds live in front of you.
 */
export function ModelLab({ onClose }: { onClose: () => void }) {
  const modelParams = useStore((s) => s.modelParams)
  const resetModelParams = useStore((s) => s.resetModelParams)
  const touched = Object.keys(modelParams).length > 0

  return (
    <aside className="slideover left lab-drawer" role="dialog" aria-label="Model lab">
      <div className="lab-drawer-head">
        <h3 className="display" style={{ margin: 0, fontSize: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FlaskConical size={18} className="gold-text" /> Model Lab
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
      <p className="low" style={{ margin: '0 0 4px', fontSize: 12 }}>
        Thirty-three live dials — every move re-rolls the odds beside you instantly.
      </p>
      <div className="lab-drawer-body">
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
      <div className="lab-drawer-foot">
        <button className="btn primary small" onClick={onClose}>
          Done
        </button>
      </div>
    </aside>
  )
}
