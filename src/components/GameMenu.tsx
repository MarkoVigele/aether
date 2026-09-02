import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { bundleFromUnknown, type PersistedBundle } from '@/lib/persist'
import { clearSlot, loadSlots, writeSlot, type SaveSlot } from '@/lib/saveSlots'
import { paletteList } from '@/simulation/palettes'
import type { PaletteId, SimSettings } from '@/simulation/types'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { stageTranslate, useSnapSheet, type SheetStage } from '@/lib/sheetDrag'
import { DisplayFpsField } from './DisplayFpsField'
import { SliderRow } from './SliderRow'
import { ToggleRow } from './ToggleRow'

const SHORTCUTS = [
  ['Esc', 'Open or close this menu'],
  ['Space', 'Pause / resume the field'],
  ['R', 'Reset particles'],
  ['N', 'New universe (shuffle forces)'],
  ['C', 'Show or hide the side panel'],
  ['1–6', 'Load a built-in preset'],
  ['Shift+1–6', 'Load a saved slot'],
  ['Drag', 'Attract, repel, or spawn'],
]

type GameMenuProps = {
  settings: SimSettings
  onChange: (settings: SimSettings) => void
  onResume: () => void
  onReset: () => void
  onLoadSettings: (settings: SimSettings) => void
  onExport: () => void
  onImportBundle: (bundle: PersistedBundle) => void
  dragEnabled?: boolean
}

export function GameMenu({
  settings,
  onChange,
  onResume,
  onReset,
  onLoadSettings,
  onExport,
  onImportBundle,
  dragEnabled = false,
}: GameMenuProps) {
  const [slots, setSlots] = useState<(SaveSlot | null)[]>(() => loadSlots())
  const [slotName, setSlotName] = useState('My setup')
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stamp = useMemo(() => new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }), [])

  const set = (partial: Partial<SimSettings>) => onChange({ ...settings, ...partial })
  const [stage, setStage] = useState<SheetStage>('mid')
  const onStage = (next: SheetStage) => {
    if (next === 'closed') {
      window.setTimeout(onResume, 280)
      return
    }
    setStage(next)
  }
  const sheetDrag = useSnapSheet(dragEnabled, stage, onStage)

  useEffect(() => {
    if (!dragEnabled || sheetDrag.dragging) return
    const node = sheetDrag.sheetRef.current
    if (!node) return
    node.style.transition = 'transform 300ms'
    node.style.transform = stageTranslate(stage)
  }, [dragEnabled, sheetDrag.dragging, sheetDrag.sheetRef, stage])

  return (
    <div className="absolute inset-x-0 bottom-[var(--dock-space)] z-50 max-md:contents md:inset-0 md:flex md:items-center md:justify-center md:bg-black/62 md:p-6 md:backdrop-blur-md">
      <div
        ref={sheetDrag.sheetRef}
        data-sheet={dragEnabled ? stage : undefined}
        className={`flex w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0b0d14]/94 shadow-2xl max-md:absolute max-md:inset-x-0 max-md:z-50 max-md:h-[var(--sheet-high)] max-md:max-h-[var(--sheet-high)] md:max-h-[92svh] md:rounded-2xl ${
          sheetDrag.dragging ? '' : 'max-md:transition-transform max-md:duration-300'
        }`}
        style={dragEnabled ? { bottom: 'var(--dock-space)' } : undefined}
      >
        <div className="sticky top-0 z-10 border-b border-white/8 bg-[#0b0d14]/94 px-4 pt-0 pb-3 md:px-5 md:pt-4 md:pb-4">
          <div
            className="flex min-h-11 cursor-grab touch-none items-center justify-center active:cursor-grabbing md:hidden"
            aria-label="Blatt ziehen"
            onPointerDown={sheetDrag.bind.onPointerDown}
          >
            <span className="h-1 w-10 rounded-full bg-white/35" aria-hidden />
          </div>
          <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.22em] text-primary/80 uppercase">Paused</p>
            <h2 className="text-xl font-semibold tracking-tight text-white">Aether menu</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="max-md:hidden" onClick={onReset}>
              Reset field
            </Button>
            <Button size="sm" className="max-md:min-h-11 max-md:px-4" onClick={onResume}>
              <span className="md:hidden">Fertig</span>
              <span className="hidden md:inline">Resume</span>
            </Button>
          </div>
          </div>
        </div>

        <div className="panel-scroll grid min-h-0 flex-1 gap-6 overflow-y-auto px-4 py-4 md:grid-cols-2 md:px-5 md:py-5">
          <section className="grid gap-3">
            <h3 className="text-[11px] font-semibold tracking-[0.16em] text-foreground/70 uppercase">
              Graphics
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['performance', 'Performance'],
                ['balanced', 'Balanced'],
                ['beautiful', 'Beautiful'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set({ quality: id })}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                    settings.quality === id
                      ? 'border-primary/40 bg-primary/12 text-white'
                      : 'border-white/8 bg-white/3 text-white/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Graphics, sliders, and slots are saved in this browser. Updates keep them and fill
              new options with defaults. You will see a warning only if a future change must
              reset incompatible data.
            </p>
            <DisplayFpsField
              value={settings.displayFps}
              onChange={(displayFps) => set({ displayFps })}
            />
            <Field label="Palette">
              <Select
                value={settings.palette}
                onValueChange={(palette) => set({ palette: palette as PaletteId })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paletteList().map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <SliderRow
              label="Trails"
              value={settings.trail}
              min={0}
              max={0.97}
              step={0.01}
              onChange={(trail) => set({ trail })}
            />
            <SliderRow
              label="Glow"
              value={settings.glow}
              min={0.4}
              max={2.2}
              step={0.02}
              onChange={(glow) => set({ glow })}
            />
            <SliderRow
              label="Particle size"
              value={settings.particleSize}
              min={1.2}
              max={8}
              step={0.1}
              onChange={(particleSize) => set({ particleSize })}
            />
            <ToggleRow
              label="Constellation links"
              checked={settings.showLinks}
              onChange={(showLinks) => set({ showLinks })}
            />
            <ToggleRow
              label="Energy arcs"
              checked={settings.showEnergy}
              onChange={(showEnergy) => set({ showEnergy })}
            />
          </section>

          <section className="grid gap-3 content-start">
            <div className="kbd-hint hidden md:contents">
              <h3 className="text-[11px] font-semibold tracking-[0.16em] text-foreground/70 uppercase">
                Controls
              </h3>
              <ul className="grid gap-1.5">
                {SHORTCUTS.map(([key, label]) => (
                  <li key={key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-white/80">{label}</span>
                    <kbd className="rounded-md border border-white/10 bg-white/6 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
                      {key}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>

            <h3 className="mt-3 text-[11px] font-semibold tracking-[0.16em] text-foreground/70 uppercase">
              Backup file
            </h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Export downloads <span className="font-mono">aether-saves.json</span>. You can keep it
              in this project folder; updates will not overwrite it. Import merges old values and
              fills new options with defaults.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="secondary" size="sm" onClick={onExport}>
                Export
              </Button>
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                Import
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  void file.text().then((text) => {
                    try {
                      const bundle = bundleFromUnknown(JSON.parse(text))
                      onImportBundle(bundle)
                      setSlots(bundle.slots)
                      setImportError(null)
                    } catch {
                      setImportError('That file could not be read. Choose an Aether export JSON.')
                    }
                  })
                }}
              />
            </div>
            {importError ? <p className="text-[11px] text-destructive">{importError}</p> : null}

            <h3 className="mt-3 text-[11px] font-semibold tracking-[0.16em] text-foreground/70 uppercase">
              Saved setups
            </h3>
            <div className="grid gap-1.5">
              <Label>Name for next save</Label>
              <input
                value={slotName}
                onChange={(event) => setSlotName(event.target.value)}
                className="h-8 rounded-md border border-border bg-secondary/70 px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
            <div className="grid gap-2">
              {slots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-2.5 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">
                      {index + 1}. {slot ? slot.name : 'Empty slot'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {slot ? stamp.format(slot.savedAt) : 'Nothing saved'}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSlots(writeSlot(slots, index, settings, slotName))}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!slot}
                    onClick={() => {
                      if (!slot) return
                      onLoadSettings(slot.settings)
                    }}
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!slot}
                    onClick={() => setSlots(clearSlot(slots, index))}
                  >
                    Clear
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
