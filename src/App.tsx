import { Download, Moon, Plus, Save, Sun, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Flag } from './components/Flag'
import { TrophyMark } from './components/TrophyMark'
import { NATION_BY_ID } from './data/nations'
import { currentChampion, deleteRun, listRuns, loadRun, saveRun, type SavedRun } from './store/archive'
import { DrawScreen } from './features/draw/DrawScreen'
import { GroupsScreen } from './features/groups/GroupsScreen'
import { KnockoutScreen } from './features/knockout/KnockoutScreen'
import { LabScreen } from './features/lab/LabScreen'
import { LandingScreen } from './features/landing/LandingScreen'
import { SeedingScreen } from './features/seeding/SeedingScreen'
import { SelectionScreen } from './features/selection/SelectionScreen'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [runs, setRuns] = useState<SavedRun[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

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

  const gates = stepGates({ entries, playoffTeams, playoffResults, hosts, pots, drawTrace, results })
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
      schemaVersion: 2,
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
        if (![1, 2].includes(p.schemaVersion) || !Array.isArray(p.entries)) throw new Error('bad file')
        useStore.setState({
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
        <div className="wordmark display row" style={{ gap: 8 }}>
          <TrophyMark height={22} />
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
                <span className="lbl">{STEP_LABELS[s]}</span>
              </button>
            )
          })}
        </nav>
        <div className="appbar-actions">
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
              <div
                className="card"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 44,
                  width: 240,
                  padding: 8,
                  zIndex: 50,
                  background: 'var(--bg-2)',
                  boxShadow: 'var(--shadow-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <SeedRow />
                <button className="btn ghost small" style={{ justifyContent: 'flex-start' }} onClick={saveCurrentRun}>
                  <Save size={14} /> Save run as…
                </button>
                {runs.length > 0 && (
                  <div className="archive">
                    <div className="archive-label">Saved runs</div>
                    {runs.map((r) => (
                      <div key={r.id} className="archive-row">
                        {r.champion ? (
                          <Flag id={r.champion} size={18} />
                        ) : (
                          <TrophyMark height={16} className="dim" />
                        )}
                        <button
                          className="archive-load"
                          title={`Load "${r.name}" — saved ${new Date(r.savedAt).toLocaleString()}`}
                          onClick={() => {
                            if (confirm(`Load "${r.name}"? The current tournament is replaced.`)) {
                              loadRun(r.id)
                              setMenuOpen(false)
                            }
                          }}
                        >
                          <span className="ar-name">{r.name}</span>
                          <span className="ar-date tnum">{new Date(r.savedAt).toLocaleDateString()}</span>
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
                    if (confirm('Start a new tournament? The current one is discarded.')) {
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
      <main>
        {step === 'landing' && <LandingScreen />}
        {step === 'lab' && <LabScreen />}
        {step === 'teams' && <SelectionScreen />}
        {step === 'pots' && <SeedingScreen />}
        {step === 'draw' && <DrawScreen />}
        {step === 'groups' && <GroupsScreen />}
        {step === 'knockout' && <KnockoutScreen />}
      </main>
    </>
  )
}

function SeedRow() {
  const masterSeed = useStore((s) => s.masterSeed)
  const setSeed = useStore((s) => s.setSeed)
  return (
    <label className="row" style={{ padding: '6px 10px', gap: 8, fontSize: 12 }}>
      <span className="low">Seed</span>
      <input
        style={{ flex: 1, minWidth: 0, height: 28, padding: '0 8px', fontSize: 12 }}
        defaultValue={masterSeed}
        onBlur={(e) => setSeed(e.target.value)}
        aria-label="Master seed"
      />
    </label>
  )
}
