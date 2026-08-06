import NumberFlow from '@number-flow/react'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Flag } from '../../components/Flag'
import { LabSlider } from '../../components/ModelLab'
import { TeamStudioBody } from '../../components/TeamStudio'
import { LAB_GROUPS, MODEL_PRESETS, PRESET_TIERS } from '../../components/labSpecs'
import { ratingOf, shortName } from '../../data/nations'
import { detailedOdds, matchOdds, GROUP_CTX } from '../../engine/simulate'
import { useStore } from '../../store/store'

/**
 * The Laboratory, rebuilt as an instrument console: a rail of chambers on the left,
 * one focused chamber in the middle, and a live console on the right — presets, the
 * model's fingerprint across three archetype ties, and your strongest pairing —
 * all re-rolling with every dial you move.
 */

const CHAMBER_BLURBS: Record<string, string> = {
  Chaos: 'Three master temperature knobs over qualification, seeding, and every match.',
  'Scoring & Tempo': 'How many goals this World Cup wants to give you — and when.',
  'Strength & Upsets': "How faithfully class tells, and how often it doesn't.",
  'Match Psychology': 'Leads protected, deficits chased, heads dropped.',
  'Context & Conditions': 'Home soil, heavy legs, thin air, and the weather.',
  'Discipline & Drama': 'Cards, penalties, rattled crossbars, stoppage-time chaos.',
  'Extra Time & Shootouts': 'The extra thirty minutes and the twelve yards after them.',
  'Randomness & Miracles': 'The nights nobody models.',
  Squads: "Every squad's world ranking, rating, and stacked boosters.",
}

const FINGERPRINT_TIES = [
  { label: 'Giant vs minnow', a: 'ESP', b: 'NZL', host: false },
  { label: 'Near equals', a: 'CRO', b: 'SUI', host: false },
  { label: 'Host on home soil', a: 'MEX', b: 'SUI', host: true },
]

export function LabScreen() {
  const modelParams = useStore((s) => s.modelParams)
  const ratingOverrides = useStore((s) => s.ratingOverrides)
  const resetModelParams = useStore((s) => s.resetModelParams)
  const applyModelPreset = useStore((s) => s.applyModelPreset)
  const clearModelParams = useStore((s) => s.clearModelParams)
  const chaos = useStore((s) => s.chaos)
  const setChaos = useStore((s) => s.setChaos)
  const entries = useStore((s) => s.entries)
  const setStep = useStore((s) => s.setStep)
  const touched = Object.keys(modelParams).length

  const chambers = useMemo(
    () => [
      { id: 'chaos', title: 'Chaos', tint: 'gold', count: 3 },
      ...LAB_GROUPS.map((g) => ({ id: g.title, title: g.title, tint: g.tint, count: g.items.length })),
      { id: 'squads', title: 'Squads', tint: 'green', count: entries.length },
    ],
    [entries.length],
  )
  const [active, setActive] = useState('Scoring & Tempo')
  const activeGroup = LAB_GROUPS.find((g) => g.title === active) ?? null

  // the model's fingerprint: three archetype ties, analytic, instant
  const fingerprint = useMemo(
    () =>
      FINGERPRINT_TIES.map((t) => {
        const o = matchOdds(t.a, t.b, { stage: 'group', homeHost: t.host }, chaos.match)
        return { ...t, fav: o.home, draw: o.draw, goals: o.lamHome + o.lamAway }
      }),
    [chaos.match, modelParams, ratingOverrides],
  )

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
  const touchedIn = (title: string): number =>
    LAB_GROUPS.find((g) => g.title === title)?.items.filter((sl) => modelParams[sl.key] !== undefined).length ?? 0

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
            Forty-three dials over the tournament's physics, three chaos knobs, and every squad's ratings and
            boosters — one chamber at a time, with the model's fingerprint live beside you.
          </p>
        </div>
        {touched > 0 && (
          <button className="btn ghost small" onClick={resetModelParams}>
            <RotateCcw size={13} /> Restore all defaults ({touched} changed)
          </button>
        )}
      </div>

      <div className="lab-console">
        <nav className="lab-rail" aria-label="Laboratory chambers">
          {chambers.map((c) => {
            const t = c.id === 'chaos' || c.id === 'squads' ? 0 : touchedIn(c.title)
            return (
              <button
                key={c.id}
                className={`rail-item tint-${c.tint}${active === c.id ? ' on' : ''}`}
                onClick={() => setActive(c.id)}
                aria-pressed={active === c.id}
              >
                <i className="bg-dot" />
                <span className="ri-name">{c.title}</span>
                <span className="ri-count tnum">{t > 0 ? `${t}·${c.count}` : c.count}</span>
              </button>
            )
          })}
        </nav>

        <section className="chamber card">
          {active === 'chaos' ? (
            <>
              <div className="chamber-head tint-gold">
                <h3 className="display">
                  <FlaskConical size={18} /> Chaos
                </h3>
                <p>{CHAMBER_BLURBS.Chaos}</p>
              </div>
              <div className="dial-grid">
                {(
                  [
                    ['qualification', 'Qualification chaos', 'Who even makes the field — chalk or carnage.'],
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
            </>
          ) : active === 'squads' ? (
            <>
              <div className="chamber-head tint-green">
                <h3 className="display">Squads</h3>
                <p>{CHAMBER_BLURBS.Squads}</p>
              </div>
              <TeamStudioBody maxHeight={520} />
            </>
          ) : activeGroup ? (
            <>
              <div className={`chamber-head tint-${activeGroup.tint}`}>
                <h3 className="display">{activeGroup.title}</h3>
                <p>{CHAMBER_BLURBS[activeGroup.title]}</p>
                {touchedIn(activeGroup.title) > 0 && (
                  <button
                    className="btn ghost small"
                    onClick={() =>
                      clearModelParams(
                        activeGroup.items.filter((sl) => modelParams[sl.key] !== undefined).map((sl) => sl.key),
                      )
                    }
                  >
                    <RotateCcw size={12} /> Reset chamber
                  </button>
                )}
              </div>
              <div className="dial-grid">
                {activeGroup.items.map((sl) => (
                  <LabSlider key={sl.key} sl={sl} />
                ))}
              </div>
            </>
          ) : null}
        </section>

        <aside className="lab-console-side">
          <div className="card lab-card">
            <div className="lab-group-label tint-gold">Calibration presets — realism to arcade</div>
            {PRESET_TIERS.map((tier) => (
              <div key={tier.id} className={`preset-tier tier-${tier.id}`}>
                <div className="tier-head" title={tier.blurb}>
                  <i className="tier-dot" aria-hidden />
                  {tier.name}
                </div>
                <div className="preset-stack">
                  {MODEL_PRESETS.filter((p) => p.tier === tier.id).map((p) => (
                    <button
                      key={p.id}
                      className={`preset-chip${activePreset?.id === p.id ? ' on' : ''}`}
                      onClick={() => applyModelPreset(p.params)}
                      title={p.blurb}
                    >
                      <span className="display">{p.name}</span>
                      <span className="low">{p.blurb}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card lab-card">
            <div className="lab-group-label tint-blue">Model fingerprint</div>
            <div className="fp-head low tnum">
              <span />
              <span>fav</span>
              <span>draw</span>
              <span>goals</span>
            </div>
            {fingerprint.map((f) => (
              <div key={f.label} className="fp-row">
                <span className="fp-label">
                  <Flag id={f.a} size={15} />
                  <Flag id={f.b} size={15} />
                  {f.label}
                </span>
                <span className="tnum">
                  <NumberFlow value={f.fav} format={{ style: 'percent', maximumFractionDigits: 0 }} />
                </span>
                <span className="tnum low">
                  <NumberFlow value={f.draw} format={{ style: 'percent', maximumFractionDigits: 0 }} />
                </span>
                <span className="tnum gold-text">
                  <NumberFlow value={f.goals} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />
                </span>
              </div>
            ))}
            <p className="low" style={{ fontSize: 10.5, margin: 0 }}>
              Three archetype ties, recomputed on every dial — the shape of your physics at a glance.
            </p>
          </div>

          {preview && (
            <div className="card lab-card preview-card">
              <div className="lab-group-label tint-gold">Your strongest pairing</div>
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
              <div className="scoreline-chips">
                {preview.odds.topScorelines.slice(0, 4).map((l) => (
                  <span key={`${l.h}-${l.a}`} className="chip tnum">
                    {l.h}–{l.a} <span className="low">{pct(l.p)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
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
