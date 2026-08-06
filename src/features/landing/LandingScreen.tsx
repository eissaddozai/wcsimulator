import { Dices, ListChecks, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import { WorldGlobe } from '../../components/WorldGlobe'
import { useStore } from '../../store/store'

export function LandingScreen() {
  const setStep = useStore((s) => s.setStep)
  const loadPreset = useStore((s) => s.loadPreset)
  const fullChaos = useStore((s) => s.fullChaos)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === '1') loadPreset()
      if (e.key === '2') setStep('lab')
      if (e.key === '3') fullChaos()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loadPreset, setStep, fullChaos])

  return (
    <section className="landing">
      <div className="landing-globe" aria-hidden>
        <WorldGlobe size={680} />
      </div>
      <div className="hero-copy">
        <div className="overline serif-accent">The 48-team era — and the 64 beyond it</div>
        <h1 className="display">
          Simulate the 2026
          <br />
          World Cup
        </h1>
        <p className="sub">
          Pick the qualifiers confederation by confederation, seed the pots, run a rule-perfect draw, and play every
          match from the group stage to the Final — with the real FIFA format at every step.
        </p>
      </div>
      <div className="fact-ticker" aria-hidden>
        <div className="ft-track">
          {[0, 1].map((dup) => (
            <span key={dup} className="ft-set">
              {[
                '48 or 64 nations',
                '12 or 16 groups',
                'Up to 128 matches',
                '211 eligible teams',
                'Hand-played play-off tournaments',
                '5 qualifying modalities',
                '34 boosters',
                '43 laboratory dials',
                '5 seeding strategies',
                'Every FIFA rule',
              ].map((f) => (
                <span key={f} className="ft-item">
                  {f}
                  <i />
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
      <div className="setup-cards">
        <button className="card setup-card recommended" onClick={loadPreset}>
          <span className="rec-tag">Fastest start</span>
          <span className="icon">
            <Trophy size={28} />
          </span>
          <span className="kbd tnum" data-hint="press">1</span>
          <h3 className="display">Real 2026</h3>
          <p>
            The actual 48 qualifiers, the real December-2025 pots, and the draw as it happened in Washington. You take
            it from the group stage.
          </p>
          <span className="btn primary">Load the real tournament</span>
        </button>
        <button className="card setup-card" onClick={() => setStep('lab')}>
          <span className="icon">
            <ListChecks size={28} />
          </span>
          <span className="kbd tnum" data-hint="press">2</span>
          <h3 className="display">Custom</h3>
          <p>
            Start in the Laboratory — 43 dials over the tournament's physics and every squad's boosters — then build
            your 48, or the expanded 64, and let the draw engine handle the rules.
          </p>
          <span className="btn gold-line">Start from scratch</span>
        </button>
        <button
          className="card setup-card"
          onClick={() => {
            fullChaos()
          }}
        >
          <span className="icon">
            <Dices size={28} />
          </span>
          <span className="kbd tnum" data-hint="press">3</span>
          <h3 className="display">Full chaos</h3>
          <p>
            One click simulates everything — qualification, seeding, draw, all 104 matches — and hands you a finished
            tournament to explore and rewrite.
          </p>
          <span className="btn gold-line">Roll the universe</span>
        </button>
      </div>
      <div className="landing-foot serif-accent">An open-source love letter to the beautiful game.</div>
    </section>
  )
}
