import { memo, useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ControlPanel, makeRandomForces } from '@/components/ControlPanel'
import { GameMenu } from '@/components/GameMenu'
import { Hud } from '@/components/Hud'
import { SimulationCanvas } from '@/components/SimulationCanvas'
import { Button } from '@/components/ui/button'
import { isNarrowViewport, useIsNarrow } from '@/lib/media'
import { useFieldTapDismiss, useSheetDrag } from '@/lib/sheetDrag'
import {
  exportPersistedJson,
  loadPersisted,
  savePersisted,
  type PersistNotice,
  type PersistedBundle,
} from '@/lib/persist'
import { loadSlots } from '@/lib/saveSlots'
import { cloneSettings, PRESETS, randomForceMatrix } from '@/simulation/settings'
import type { SimSettings, SimStats } from '@/simulation/types'
import { PALETTES } from '@/simulation/palettes'
import { Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react'

const emptyStats: SimStats = {
  fps: 0,
  population: 0,
  births: 0,
  deaths: 0,
  avgEnergy: 0,
  avgAge: 0,
  bySpecies: [],
}

const MemoControls = memo(ControlPanel)

function redirectToStableOrigin() {
  if (typeof window === 'undefined') return
  if (window.location.hostname === 'localhost') {
    const next = new URL(window.location.href)
    next.hostname = '127.0.0.1'
    window.location.replace(next.toString())
  }
}

export default function App() {
  const initial = useMemo(() => loadPersisted(), [])
  const [settings, setSettings] = useState<SimSettings>(() => initial.bundle.settings)
  const [paused, setPaused] = useState(false)
  const [seed, setSeed] = useState(() => (Math.random() * 1_000_000) | 0)
  const [resetKey, setResetKey] = useState(0)
  const [panelOpen, setPanelOpen] = useState(() =>
    isNarrowViewport() ? false : initial.bundle.panelOpen,
  )
  const [presetId, setPresetId] = useState(() => initial.bundle.presetId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetSection, setSheetSection] = useState<string | null>('world')
  const [notice, setNotice] = useState<PersistNotice>(initial.notice)
  const narrow = useIsNarrow()
  const pointerToolOpen = panelOpen && sheetSection === 'pointer'
  const dismissField = useCallback(() => {
    if (menuOpen) {
      setMenuOpen(false)
      return
    }
    if (panelOpen && !pointerToolOpen) setPanelOpen(false)
  }, [menuOpen, panelOpen, pointerToolOpen])
  const fieldDismiss = useFieldTapDismiss(dismissField)
  const closePanel = useCallback(() => setPanelOpen(false), [])
  const sheetDrag = useSheetDrag(closePanel, narrow && panelOpen)

  const bg = useMemo(() => PALETTES[settings.palette].background, [settings.palette])

  useEffect(() => {
    redirectToStableOrigin()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const { bundle } = loadPersisted()
      savePersisted({
        ...bundle,
        settings,
        panelOpen: isNarrowViewport() ? bundle.panelOpen : panelOpen,
        presetId,
      })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [panelOpen, presetId, settings])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767.98px)')
    const onChange = () => {
      if (media.matches) setPanelOpen(false)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const reset = useCallback(() => {
    setResetKey((n) => n + 1)
  }, [])

  const newUniverse = useCallback(() => {
    setSettings((current) => ({
      ...current,
      forceMatrix: randomForceMatrix(current.speciesCount, (Math.random() * 1e9) | 0),
    }))
    setSeed((Math.random() * 1_000_000) | 0)
    setResetKey((n) => n + 1)
  }, [])

  const shuffleForces = useCallback(() => {
    setSettings((current) => makeRandomForces(current))
  }, [])

  const applyPreset = useCallback((id: string) => {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    setPresetId(id)
    setSettings(cloneSettings(preset.apply()))
    setSeed((Math.random() * 1_000_000) | 0)
    setResetKey((n) => n + 1)
  }, [])

  const exportSaves = useCallback(() => {
    const { bundle } = loadPersisted()
    exportPersistedJson({
      ...bundle,
      settings,
      panelOpen,
      presetId,
    })
  }, [panelOpen, presetId, settings])

  const importSaves = useCallback((bundle: PersistedBundle) => {
    savePersisted(bundle)
    setSettings(bundle.settings)
    setPanelOpen(bundle.panelOpen)
    setPresetId(bundle.presetId)
    setSeed((Math.random() * 1_000_000) | 0)
    setResetKey((n) => n + 1)
    setNotice({
      level: 'info',
      text: 'Imported setups. Compatible values were kept; new options use defaults.',
    })
  }, [])

  const loadSaved = useCallback((next: SimSettings) => {
    setPresetId('slot')
    setSettings(cloneSettings(next))
    setSeed((Math.random() * 1_000_000) | 0)
    setResetKey((n) => n + 1)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.code === 'Escape') {
        event.preventDefault()
        setMenuOpen((v) => !v)
        return
      }
      if (menuOpen) return
      if (event.code === 'Space') {
        event.preventDefault()
        setPaused((v) => !v)
      } else if (event.key === 'r' || event.key === 'R') {
        reset()
      } else if (event.key === 'n' || event.key === 'N') {
        newUniverse()
      } else if (event.key === 'c' || event.key === 'C') {
        setPanelOpen((v) => !v)
      } else if (event.key >= '1' && event.key <= '6') {
        const index = Number(event.key) - 1
        if (event.shiftKey) {
          const slot = loadSlots()[index]
          if (slot) loadSaved(slot.settings)
        } else {
          const preset = PRESETS[index]
          if (preset) applyPreset(preset.id)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyPreset, loadSaved, menuOpen, newUniverse, reset])

  return (
    <div className="relative h-svh h-dvh w-full overflow-hidden" style={{ background: bg }}>
      <LiveField
        settings={settings}
        paused={paused || menuOpen}
        resetKey={resetKey}
        seed={seed}
        panelOpen={panelOpen}
        onTogglePause={() => setPaused((v) => !v)}
        onReset={reset}
        onRandomize={newUniverse}
        onTogglePanel={() => setPanelOpen((v) => !v)}
        onOpenMenu={() => setMenuOpen(true)}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />

      {narrow && (panelOpen || menuOpen) && !pointerToolOpen ? (
        <div
          className="absolute inset-0 z-[15] md:hidden"
          style={{ bottom: 'var(--dock-space)' }}
          {...fieldDismiss}
          role="presentation"
        />
      ) : null}

      {notice ? (
        <div className="absolute inset-x-0 top-0 z-40 flex justify-center p-3 pt-20">
          <div
            className={`pointer-events-auto max-w-lg rounded-xl border px-3 py-2 text-xs leading-relaxed shadow-lg ${
              notice.level === 'warning'
                ? 'border-amber-400/30 bg-amber-950/90 text-amber-50'
                : 'border-primary/25 bg-[#0b0d14]/90 text-white/85'
            }`}
          >
            <p>{notice.text}</p>
            <button
              type="button"
              className="mt-1 text-[11px] text-white/60 underline"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <aside
        className={`absolute inset-x-0 z-30 flex max-h-[min(42svh,42dvh)] flex-col overflow-hidden border-t border-white/10 bg-[#07080d]/82 backdrop-blur-xl md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:max-h-none md:w-[360px] md:border-t-0 md:border-l md:transition-transform md:duration-300 ${
          sheetDrag.dragging ? '' : 'max-md:transition-transform max-md:duration-300'
        } ${
          panelOpen
            ? 'md:translate-x-0'
            : 'max-md:pointer-events-none md:pointer-events-auto md:translate-x-full'
        }`}
        style={{
          bottom: 'var(--dock-space)',
          transform: narrow
            ? `translateY(${
                sheetDrag.dragging
                  ? sheetDrag.offset < 0
                    ? `${sheetDrag.offset * 0.35}px`
                    : `${sheetDrag.offset}px`
                  : panelOpen
                    ? '0px'
                    : 'calc(100% + var(--dock-space) + 0.75rem)'
              })`
            : undefined,
        }}
      >
        <SheetHeader
          onClose={() => setPanelOpen(false)}
          onOpenMenu={() => setMenuOpen(true)}
          dragBind={sheetDrag.bind}
        />
        <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible md:pb-0">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`shrink-0 rounded-full border px-3 py-2 text-left transition md:rounded-lg md:px-2.5 ${
                  presetId === preset.id
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-white/8 bg-white/3 hover:bg-white/6'
                }`}
              >
                <span className="block text-xs font-medium text-white">{preset.label}</span>
                <span className="mt-0.5 hidden text-[10px] leading-snug text-muted-foreground md:block">
                  {preset.blurb}
                </span>
              </button>
            ))}
          </div>
          <MemoControls
            settings={settings}
            onChange={setSettings}
            onRandomForces={shuffleForces}
            onOpenSection={setSheetSection}
          />
        </div>
      </aside>

      <nav
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2 px-3 pt-1.5 md:hidden"
        style={{ paddingBottom: 'max(0.45rem, env(safe-area-inset-bottom))' }}
      >
        <Button
          variant="secondary"
          className="h-11 min-w-11 px-3.5 [&_svg]:size-5"
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? 'Play' : 'Pause'}
        >
          {paused ? <Play /> : <Pause />}
          Pause
        </Button>
        <Button
          variant={panelOpen ? 'default' : 'secondary'}
          className="h-11 min-w-11 px-3.5 [&_svg]:size-5"
          onClick={() => setPanelOpen((v) => !v)}
        >
          <SlidersHorizontal />
          Panel
        </Button>
        <Button
          variant="secondary"
          className="h-11 min-w-11 px-3.5 [&_svg]:size-5"
          onClick={reset}
        >
          <RotateCcw />
          Reset
        </Button>
      </nav>

      {menuOpen ? (
        <GameMenu
          settings={settings}
          onChange={setSettings}
          onResume={() => setMenuOpen(false)}
          onReset={reset}
          onLoadSettings={loadSaved}
          onExport={exportSaves}
          onImportBundle={importSaves}
          dragEnabled={narrow}
        />
      ) : null}
    </div>
  )
}

function SheetHeader({
  onClose,
  onOpenMenu,
  dragBind,
}: {
  onClose: () => void
  onOpenMenu: () => void
  dragBind: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  }
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-white/8 bg-[#07080d]/90 px-4 pt-0 pb-2 backdrop-blur-xl md:static md:pt-3 md:pb-3">
      <div
        className="flex min-h-11 cursor-grab touch-none items-center justify-center active:cursor-grabbing md:hidden"
        aria-label="Ziehen zum Schließen"
        {...dragBind}
      >
        <span className="h-1 w-10 rounded-full bg-white/35" aria-hidden />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Field controls</p>
          <p className="kbd-hint hidden text-[11px] text-muted-foreground md:block">
            Esc menu · Space pause · R reset · 1–6 presets
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" className="max-md:hidden" onClick={onOpenMenu}>
            Menu
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="max-md:min-h-11 max-md:px-3"
            onClick={onClose}
          >
            <span className="md:hidden">Fertig</span>
            <span className="hidden md:inline">Hide</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function LiveField({
  settings,
  paused,
  resetKey,
  seed,
  panelOpen,
  onTogglePause,
  onReset,
  onRandomize,
  onTogglePanel,
  onOpenMenu,
}: {
  settings: SimSettings
  paused: boolean
  resetKey: number
  seed: number
  panelOpen: boolean
  onTogglePause: () => void
  onReset: () => void
  onRandomize: () => void
  onTogglePanel: () => void
  onOpenMenu: () => void
}) {
  const [stats, setStats] = useState<SimStats>(emptyStats)
  return (
    <>
      <SimulationCanvas
        settings={settings}
        paused={paused}
        resetKey={resetKey}
        seed={seed}
        onStats={setStats}
      />
      <Hud
        stats={stats}
        paused={paused}
        seed={seed}
        palette={settings.palette}
        speciesCount={settings.speciesCount}
        panelOpen={panelOpen}
        onTogglePause={onTogglePause}
        onReset={onReset}
        onRandomize={onRandomize}
        onTogglePanel={onTogglePanel}
        onOpenMenu={onOpenMenu}
      />
    </>
  )
}
