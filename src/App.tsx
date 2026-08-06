import { motion } from 'framer-motion'
import { Copy, Download, Moon, Plus, Save, Sun, Trash2, Upload, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from './components/Flag'
import { TrophyMark } from './components/TrophyMark'
import { MODEL_PRESETS } from './components/labSpecs'
import { NATION_BY_ID } from './data/nations'
import { currentChampion, deleteRun, listRuns, loadRun, saveRun, type RunSnapshot, type SavedRun } from './store/archive'
import { DrawScreen } from './features/draw/DrawScreen'
import { GroupsScreen } from './features/groups/GroupsScreen'
import { KnockoutScreen } from './features/knockout/KnockoutScreen'
import { LabScreen } from './features/lab/LabScreen'
import { LandingScreen } from './features/landing/LandingScreen'
import { SeedingScreen } from './features/seeding/SeedingScreen'
import { SelectionScreen } from './features/selection/SelectionScreen'
import { groupMatchCountFor, koRangeFor } from './engine/schedule'
import { STEP_ORDER, stepGates, useStore, type Step } from './store/store'

const STEP_LABELS: Record<Step, string> = {
  landing: 'Setup',
  lab: 'Lab',
  teams: 'Teams',
  pots: 'Pots',
  draw: 'Draw',
  groups: 'Groups',
  knockout: 'Knockout',
}

/** "2h ago" style timestamps for the archive rows. */
function relativeTime(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

/** Which calibration preset a saved run was using, if any. */
function presetOf(snap: RunSnapshot): string | null {
  const params = snap.modelParams ?? {}
  const keys = Object.keys(params)
  if (keys.length === 0) return null
  const hit = MODEL_PRESETS.find(
    (p) =>
      Object.keys(p.params).length === keys.length &&
      Object.entries(p.params).every(([k, v]) => params[k as keyof typeof params] === v),
  )
  return hit?.name ?? 'Custom physics'
}

export default function App() {
  const step = useStore((s) => s.step)
  const theme = useStore((s) => s.theme)
  const setStep = useStore((s) => s.setStep)
  const setTheme = useStore((s) => s.setTheme)
  const entries = useStore((s) => s.entries)
  const playoffTeams = useStore((s) => s.playoffTeams)
  const playoffResults = useStore((s) => s.playoffResults)
  const hosts = useStore((s) => s.hosts)
  const pots = useStore((s) => s.pots)
  const drawTrace = useStore((s) => s.drawTrace)
  const results = useStore((s) => s.results)
  const format = useStore((s) => s.format)
  const uiZoom = useStore((s) => s.uiZoom)
  const setUiZoom = useStore((s) => s.setUiZoom)
  const masterSeed = useStore((s) => s.masterSeed)
  const [menuOpen, setMenuOpen] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [runs, setRuns] = useState<SavedRun[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // 11 · the appbar trophy earns a star once a champion is crowned
  const crowned = useMemo(() => {
    try {
      return currentChampion() !== null
    } catch {
      return false
    }
  }, [results, drawTrace, format]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (menuOpen) setRuns(listRuns())
  }, [menuOpen])

  const saveCurrentRun = () => {
    const champ = currentChampion()
    const suggestion = champ
      ? `${NATION_BY_ID.get(champ)?.name ?? champ} lift it`
      : `Run of ${new Date().toLocaleDateString()}`
    const name = prompt('Name this tournament run:', suggestion)
    if (name === null) return
    saveRun(name)
    setRuns(listRuns())
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const gates = stepGates({ entries, playoffTeams, playoffResults, hosts, pots, drawTrace, results, format })

  // 75 · the active step shows how far along it is
  const stepProgress = useMemo((): number | null => {
    if (step === 'groups') {
      const total = groupMatchCountFor(format)
      const done = Object.keys(results).filter((k) => Number(k) <= total).length
      return total ? done / total : null
    }
    if (step === 'knockout') {
      const [from, to] = koRangeFor(format)
      const done = Object.keys(results).filter((k) => Number(k) >= from && Number(k) <= to).length
      return done / (to - from + 1)
    }
    return null
  }, [step, results, format])
  const gateFor = (s: Step): boolean => {
    if (s === 'landing' || s === 'lab' || s === 'teams') return true
    if (s === 'pots') return gates.pots
    if (s === 'draw') return gates.draw
    if (s === 'groups') return gates.groups
    return gates.groups // knockout viewable once groups exist (ghost nodes before completion)
  }

  const exportJson = () => {
    const s = useStore.getState()
    const payload = {
      schemaVersion: 3,
      format: s.format,
      masterSeed: s.masterSeed,
      chaos: s.chaos,
      strategy: s.strategy,
      hosts: s.hosts,
      entries: s.entries,
      pots: s.pots,
      drawTrace: s.drawTrace,
      results: s.results,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `wc26-${s.masterSeed}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMenuOpen(false)
  }

  const importJson = (file: File) => {
    void file.text().then((txt) => {
      try {
        const p = JSON.parse(txt)
        if (![1, 2, 3].includes(p.schemaVersion) || !Array.isArray(p.entries)) throw new Error('bad file')
        useStore.setState({
          format: p.format === 64 ? 64 : 48,
          masterSeed: String(p.masterSeed ?? 'IMPORTED'),
          chaos: p.chaos ?? { qualification: 1, seeding: 1, match: 1 },
          strategy: p.strategy ?? 'official',
          hosts: Array.isArray(p.hosts) && p.hosts.length > 0 ? p.hosts : ['MEX', 'CAN', 'USA'],
          hostsChosen: true,
          entries: p.entries,
          pots: p.pots ?? null,
          drawTrace: p.drawTrace ?? null,
          results: p.results ?? {},
          step: p.drawTrace ? 'groups' : 'teams',
        })
      } catch {
        alert('That file is not a WC26 Simulator export.')
      }
    })
    setMenuOpen(false)
  }

  return (
    <>
      <header className="appbar">
        <div className={`wordmark display row${crowned ? ' crowned' : ''}`} style={{ gap: 8 }}>
          <span className="wm-trophy">
            <TrophyMark height={22} />
            {crowned && <i className="wm-star" aria-hidden>✦</i>}
          </span>
          WC26 <b>SIMULATOR</b>
        </div>
        <nav className="stepper" aria-label="Tournament steps">
          {STEP_ORDER.map((s, i) => {
            const active = step === s
            const done = STEP_ORDER.indexOf(step) > i
            const open = gateFor(s)
            return (
              <button
                key={s}
                className={`step${active ? ' active' : ''}${done ? ' done' : ''}${open ? '' : ' locked'}`}
                onClick={() => open && setStep(s)}
                aria-current={active ? 'step' : undefined}
                title={open ? STEP_LABELS[s] : 'Complete the earlier steps first'}
              >
                <span className="disc tnum">{done ? '✓' : i + 1}</span>
                <span className="lbl">
                  {STEP_LABELS[s]}
                  {active && stepProgress !== null && (
                    <i className="step-prog" aria-hidden>
                      <b style={{ transform: `scaleX(${stepProgress})` }} />
                    </i>
                  )}
                </span>
                {i < STEP_ORDER.length - 1 && <i className={`step-link${done ? ' filled' : ''}`} aria-hidden />}
              </button>
            )
          })}
        </nav>
        <div className="appbar-actions">
          <div style={{ position: 'relative' }}>
            <button
              className="btn icon ghost"
              onClick={() => setZoomOpen((o) => !o)}
              aria-label="Interface zoom"
              title="Interface zoom — every screen scales"
            >
              <ZoomIn size={15} />
            </button>
            {zoomOpen && (
              <div className="zoom-pop card" role="group" aria-label="Interface zoom">
                <button className="dice-btn" onClick={() => setUiZoom(+(uiZoom - 0.05).toFixed(2))} aria-label="Zoom out">
                  <ZoomOut size={13} />
                </button>
                <button className="zoom-pct tnum" onClick={() => setUiZoom(1)} title="Reset to 100%">
                  {Math.round(uiZoom * 100)}%
                </button>
                <button className="dice-btn" onClick={() => setUiZoom(+(uiZoom + 0.05).toFixed(2))} aria-label="Zoom in">
                  <ZoomIn size={13} />
                </button>
              </div>
            )}
          </div>
          <button
            className="btn icon ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn small" onClick={() => setMenuOpen((o) => !o)}>
              Tournament
            </button>
            {menuOpen && (
              <div className="card menu-drawer">
                <div className="menu-section">Run</div>
                <div className="seed-row">
                  <span className="low">Seed</span>
                  <input
                    className="seed-in tnum"
                    defaultValue={masterSeed}
                    onBlur={(e) => useStore.getState().setSeed(e.target.value)}
                    aria-label="Master seed"
                  />
                  <button
                    className="dice-btn"
                    title="Copy the seed"
                    onClick={() => void navigator.clipboard?.writeText(masterSeed)}
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <button className="btn ghost small" style={{ justifyContent: 'flex-start' }} onClick={saveCurrentRun}>
                  <Save size={14} /> Save run as…
                  {crowned && (
                    <span style={{ marginLeft: 'auto' }} title="A champion is crowned — worth saving">
                      <Flag id={currentChampion()!} size={15} />
                    </span>
                  )}
                </button>
                {runs.length > 0 && (
                  <div className="archive">
                    <div className="menu-section">Archive</div>
                    {runs.map((r) => (
                      <div key={r.id} className="archive-row">
                        {r.champion ? (
                          <Flag id={r.champion} size={18} />
                        ) : (
                          <TrophyMark height={16} className="dim" />
                        )}
                        <button
                          className="archive-load"
                          title={`Load "${r.name}" — saved ${new Date(r.savedAt).toLocaleString()}${presetOf(r.snapshot) ? ` · ${presetOf(r.snapshot)}` : ''}`}
                          onClick={() => {
                            if (confirm(`Load "${r.name}"? The current tournament is replaced.`)) {
                              loadRun(r.id)
                              setMenuOpen(false)
                            }
                          }}
                        >
                          <span className="ar-name">{r.name}</span>
                          <span className="ar-meta">
                            <i className="fmt-badge tnum">{r.snapshot.format ?? 48}</i>
                            <span className="ar-date tnum">{relativeTime(r.savedAt)}</span>
                          </span>
                        </button>
                        <button
                          className="dice-btn"
                          title="Delete this saved run"
                          onClick={() => {
                            deleteRun(r.id)
                            setRuns(listRuns())
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="menu-section">Data</div>
                <button className="btn ghost small" style={{ justifyContent: 'flex-start' }} onClick={exportJson}>
                  <Download size={14} /> Export JSON
                </button>
                <button
                  className="btn ghost small"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={14} /> Import JSON
                </button>
                <button
                  className="btn ghost small danger"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => {
                    if (confirm('Start a new tournament? Everything resets — teams, scores, ratings, boosters, and lab settings. Only saved runs in the archive are kept.')) {
                      useStore.getState().reset()
                      setMenuOpen(false)
                    }
                  }}
                >
                  <Plus size={14} /> New tournament
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importJson(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </header>
      <main style={{ zoom: uiZoom }}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        >
          {step === 'landing' && <LandingScreen />}
          {step === 'lab' && <LabScreen />}
          {step === 'teams' && <SelectionScreen />}
          {step === 'pots' && <SeedingScreen />}
          {step === 'draw' && <DrawScreen />}
          {step === 'groups' && <GroupsScreen />}
          {step === 'knockout' && <KnockoutScreen />}
        </motion.div>
      </main>
    </>
  )
}
