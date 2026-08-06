import { motion } from 'framer-motion'
import { ArrowRight, Dices, ListChecks, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import { Flag } from '../../components/Flag'
import { WorldGlobe } from '../../components/WorldGlobe'
import { useStore } from '../../store/store'

/** The marquee of nations that closes the page — a slow parade of the eligible world. */
const RAIL = [
  'BRA', 'FRA', 'ARG', 'ENG', 'ESP', 'GER', 'POR', 'NED', 'ITA', 'MAR',
  'JPN', 'USA', 'MEX', 'CRO', 'URU', 'COL', 'KOR', 'SEN', 'AUS', 'CAN',
  'EGY', 'NGA', 'KSA', 'NZL',
]

const TICKETS = [
  {
    kbd: '1',
    icon: Trophy,
    title: 'Real 2026',
    tag: 'Fastest start',
    body: 'The actual qualifiers, the real pots, the Washington draw — you take it from the group stage.',
    cta: 'Load the real tournament',
    primary: true,
  },
  {
    kbd: '2',
    icon: ListChecks,
    title: 'Custom',
    tag: 'Full control',
    body: 'Open the Laboratory, bend the physics, pick your hosts, and build a 48 — or the expanded 64.',
    cta: 'Start from scratch',
    primary: false,
  },
  {
    kbd: '3',
    icon: Dices,
    title: 'Full chaos',
    tag: 'One click',
    body: 'Qualification, seeding, draw, every match — a finished World Cup lands in your lap to rewrite.',
    cta: 'Roll the universe',
    primary: false,
  },
] as const

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.2, 0, 0, 1] as const },
})

export function LandingScreen() {
  const setStep = useStore((s) => s.setStep)
  const loadPreset = useStore((s) => s.loadPreset)
  const fullChaos = useStore((s) => s.fullChaos)
  const actions = [loadPreset, () => setStep('lab'), fullChaos]

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
    <section className="landing landing-v2">
      <div className="landing-globe" aria-hidden>
        <WorldGlobe size={760} />
      </div>

      <div className="hero-copy hero-left">
        <motion.div {...rise(0.05)} className="overline serif-accent">
          The 48-team era — and the 64 beyond it
        </motion.div>
        <motion.h1 {...rise(0.14)} className="display hero-title">
          Simulate the
          <em className="serif-accent hero-em">beautiful game's</em>
          biggest stage
        </motion.h1>
        <motion.p {...rise(0.24)} className="sub">
          Qualification to coronation: pick the field, seed the pots, run a rule-perfect draw, and play
          every minute of every match through a living simulation engine.
        </motion.p>
        <motion.div {...rise(0.32)} className="hero-stats" role="group" aria-label="What's inside">
          {[
            ['48·64', 'formats'],
            ['128', 'matches'],
            ['211', 'nations'],
            ['40', 'physics dials'],
            ['∞', 'universes'],
          ].map(([n, l]) => (
            <span key={l} className="hstat">
              <b className="display tnum">{n}</b>
              <i>{l}</i>
            </span>
          ))}
        </motion.div>
      </div>

      <div className="tickets">
        {TICKETS.map((t, i) => (
          <motion.button
            key={t.title}
            {...rise(0.42 + i * 0.09)}
            className={`ticket${t.primary ? ' headline-ticket' : ''}`}
            onClick={actions[i]}
          >
            <span className="tk-index display tnum">{t.kbd}</span>
            <span className="tk-icon">
              <t.icon size={22} />
            </span>
            <span className="tk-copy">
              <span className="tk-head">
                <b className="display">{t.title}</b>
                <i className="tk-tag">{t.tag}</i>
              </span>
              <span className="tk-body">{t.body}</span>
            </span>
            <span className={`tk-cta${t.primary ? ' gold' : ''}`}>
              {t.cta}
              <ArrowRight size={14} />
            </span>
          </motion.button>
        ))}
      </div>

      <motion.div {...rise(0.75)} className="flag-rail" aria-hidden>
        <div className="fr-track">
          {[0, 1].map((dup) => (
            <span key={dup} className="fr-set">
              {RAIL.map((id) => (
                <Flag key={`${dup}-${id}`} id={id} size={22} />
              ))}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="landing-foot serif-accent">An open-source love letter to the beautiful game.</div>
    </section>
  )
}
