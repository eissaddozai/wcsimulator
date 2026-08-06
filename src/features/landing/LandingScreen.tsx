import { Dices, ListChecks, Trophy } from 'lucide-react'
import { useStore } from '../../store/store'

export function LandingScreen() {
  const setStep = useStore((s) => s.setStep)
  const loadPreset = useStore((s) => s.loadPreset)
  const fullChaos = useStore((s) => s.fullChaos)

  return (
    <section className="landing">
      <div className="overline serif-accent">The 48-team era</div>
      <h1 className="display">
        Simulate the 2026
        <br />
        World Cup
      </h1>
      <p className="sub">
        Pick the qualifiers confederation by confederation, seed the pots, run a rule-perfect draw, and play every
        match from the group stage to the Final — with the real FIFA format at every step.
      </p>
      <div className="setup-cards">
        <button className="card setup-card" onClick={loadPreset}>
          <span className="icon">
            <Trophy size={28} />
          </span>
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
          <h3 className="display">Custom</h3>
          <p>
            Start in the Laboratory — 31 dials over the tournament's physics and every squad's boosters — then build
            your 48 and let the draw engine handle the rules.
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
          <h3 className="display">Full chaos</h3>
          <p>
            One click simulates everything — qualification, seeding, draw, all 104 matches — and hands you a finished
            tournament to explore and rewrite.
          </p>
          <span className="btn gold-line">Roll the universe</span>
        </button>
      </div>
    </section>
  )
}
