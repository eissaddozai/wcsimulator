import { FlaskConical, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import { Flag } from '../../components/Flag'
import { LabSlider } from '../../components/ModelLab'
import { TeamStudioBody } from '../../components/TeamStudio'
import { LAB_GROUPS, MODEL_PRESETS } from '../../components/labSpecs'
import { ratingOf, shortName } from '../../data/nations'
import { detailedOdds, GROUP_CTX } from '../../engine/simulate'
import { useStore } from '../../store/store'

/**
 * The Laboratory: a full section of the flow where the simulator is tuned across
 * 26 engine domains + the three chaos knobs, and every squad's ratings and boosters
 * are edited — all before a ball is kicked.
 */
export function LabScreen() {
  const modelParams = useStore((s) => s.modelParams)
  const ratingOverrides = useStore((s) => s.ratingOverrides)
  const resetModelParams = useStore((s) => s.resetModelParams)
  const applyModelPreset = useStore((s) => s.applyModelPreset)
  const chaos = useStore((s) => s.chaos)
  const setChaos = useStore((s) => s.setChaos)
  const entries = useStore((s) => s.entries)
  const setStep = useStore((s) => s.setStep)
  const touched = Object.keys(modelParams).length

  // live preview: the two strongest chosen sides, odds recomputed on every dial move
  const preview = useMemo(() => {
    const byRating = entries.slice().sort((a, b) => ratingOf(b) - ratingOf(a))
    const [a, b] = [byRating[0], byRating[1] ?? byRating[0]]
    if (!a || !b || a === b) return null
    return { a, b, odds: detailedOdds(a, b, GROUP_CTX, chaos.match) }
  }, [entries, chaos.match, modelParams, ratingOverrides])

  const activePreset = MODEL_PRESETS.find(
    (p) =>
      Object.keys(p.params).length === touched &&
      Object.entries(p.params).every(([k, v]) => modelParams[k as keyof typeof modelParams] === v),
  )

  const pct = (x: number) => `${Math.round(x * 100)}%`

  return (
    <div className="page">
      <div className="lab-hero">
        <div>
          <div className="overline serif-accent gold-text" style={{ fontSize: 17 }}>
            Before a ball is kicked
          </div>
          <h2 className="display" style={{ fontSize: 44, margin: 0, lineHeight: 1 }}>
            The Laboratory
          </h2>
          <p className="muted" style={{ maxWidth: 620, margin: '8px 0 0' }}>
            Thirty-one dials over the tournament's physics — scoring, upsets, nerves, fatigue, shootouts, chaos —
            plus every squad's ratings and boosters. Everything here feeds the minute-by-minute match engine.
          </p>
        </div>
        {touched > 0 && (
          <button className="btn ghost small" onClick={resetModelParams}>
            <RotateCcw size={13} /> Restore defaults ({touched} changed)
          </button>
        )}
      </div>

      <div className="preset-row">
        {MODEL_PRESETS.map((p) => (
          <button
            key={p.id}
            className={`preset-card${activePreset?.id === p.id ? ' on' : ''}`}
            onClick={() => applyModelPreset(p.params)}
            title={p.blurb}
          >
            <span className="display" style={{ fontSize: 17 }}>
              {p.name}
            </span>
            <span className="low" style={{ fontSize: 11 }}>
              {p.blurb}
            </span>
          </button>
        ))}
      </div>

      <div className="lab-layout">
        <div className="lab-grid">
          <div className="card lab-card">
            <div className="lab-group-label tint-gold">
              <FlaskConical size={12} /> Chaos Knobs
            </div>
            {(
              [
                ['qualification', 'Qualification chaos', 'Who even makes the 48 — chalk or carnage.'],
                ['seeding', 'Seeding chaos', 'How honest the pots are about the rankings.'],
                ['match', 'Match chaos', 'Per-match temperature for every dice roll and odds readout.'],
              ] as const
            ).map(([key, label, blurb]) => (
              <label key={key} className="lab-slider">
                <span className="row spread">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                  <span className="tnum gold-text" style={{ fontSize: 13 }}>
                    {chaos[key] < 0.34 ? 'chalk' : chaos[key] < 0.9 ? 'sensible' : chaos[key] < 1.4 ? 'realistic' : 'anarchy'}
                  </span>
                </span>
                <input
                  className="chaos-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(chaos[key] * 50)}
                  onChange={(e) => setChaos(key, Number(e.target.value) / 50)}
                  aria-label={label}
                />
                <span className="low" style={{ fontSize: 11 }}>
                  {blurb}
                </span>
              </label>
            ))}
          </div>
          {LAB_GROUPS.map((g) => (
            <div key={g.title} className="card lab-card">
              <div className={`lab-group-label tint-${g.tint}`}>{g.title}</div>
              {g.items.map((sl) => (
                <LabSlider key={sl.key} sl={sl} />
              ))}
            </div>
          ))}
        </div>

        <aside className="lab-side">
          {preview && (
            <div className="card lab-card preview-card">
              <div className="lab-group-label tint-gold">Live Preview</div>
              <div className="row spread" style={{ fontSize: 13, fontWeight: 600 }}>
                <span className="row" style={{ gap: 6 }}>
                  <Flag id={preview.a} size={20} /> {shortName(preview.a)}
                </span>
                <span className="low">vs</span>
                <span className="row" style={{ gap: 6 }}>
                  {shortName(preview.b)} <Flag id={preview.b} size={20} />
                </span>
              </div>
              <div className="odds-bar">
                <i style={{ width: pct(preview.odds.home) }} />
                <i className="d" style={{ width: pct(preview.odds.draw) }} />
                <i className="a" style={{ width: pct(preview.odds.away) }} />
              </div>
              <div className="row spread low" style={{ fontSize: 11 }}>
                <span>{pct(preview.odds.home)}</span>
                <span>draw {pct(preview.odds.draw)}</span>
                <span>{pct(preview.odds.away)}</span>
              </div>
              <div className="low tnum" style={{ fontSize: 11, textAlign: 'center' }}>
                xG {preview.odds.lamHome.toFixed(2)} – {preview.odds.lamAway.toFixed(2)} · BTTS{' '}
                {pct(preview.odds.btts)} · O2.5 {pct(preview.odds.over25)}
              </div>
              <div className="scoreline-chips">
                {preview.odds.topScorelines.slice(0, 4).map((l) => (
                  <span key={`${l.h}-${l.a}`} className="chip tnum">
                    {l.h}–{l.a} <span className="low">{pct(l.p)}</span>
                  </span>
                ))}
              </div>
              <p className="low" style={{ fontSize: 11, margin: 0, textAlign: 'center' }}>
                Your two strongest squads, re-computed on every dial you move.
              </p>
            </div>
          )}
          <div className="card lab-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 320 }}>
            <div className="lab-group-label tint-green">Squads · Ratings & Boosters</div>
            <p className="low" style={{ fontSize: 11, margin: '0 0 8px' }}>
              {entries.length} teams in the tournament so far — hosts qualify automatically; the rest join from the
              Teams step.
            </p>
            <TeamStudioBody maxHeight={420} />
          </div>
        </aside>
      </div>

      <div className="footerbar">
        <span className="why">The Laboratory is always open — come back mid-tournament to bend physics.</span>
        <button className="btn primary" onClick={() => setStep('teams')}>
          Continue to Teams
        </button>
      </div>
    </div>
  )
}
