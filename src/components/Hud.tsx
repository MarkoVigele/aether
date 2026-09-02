import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PALETTES } from '@/simulation/palettes'
import type { PaletteId, SimStats } from '@/simulation/types'
import { ChevronDown, Dices, Menu, Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

type HudProps = {
  stats: SimStats
  paused: boolean
  seed: number
  palette: PaletteId
  speciesCount: number
  panelOpen: boolean
  onTogglePause: () => void
  onReset: () => void
  onRandomize: () => void
  onTogglePanel: () => void
  onOpenMenu: () => void
}

export function Hud({
  stats,
  paused,
  seed,
  palette,
  speciesCount,
  panelOpen,
  onTogglePause,
  onReset,
  onRandomize,
  onTogglePanel,
  onOpenMenu,
}: HudProps) {
  const [open, setOpen] = useState(false)
  const colors = PALETTES[palette].colors

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-2 sm:p-3">
      <button
        type="button"
        className="pointer-events-auto flex min-h-11 min-w-11 flex-col items-start justify-center rounded-md px-1.5 py-1 text-left md:min-h-7"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Hide stats' : 'Show stats'}
      >
        <span className="inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums text-white/50">
          {stats.fps.toFixed(0)} fps
          <ChevronDown
            className={cn('size-2.5 text-white/35 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </span>
        {open ? (
          <span className="mt-1 grid gap-0.5 font-mono text-[10px] leading-snug text-white/48">
            <span>
              {stats.population} alive · {stats.births} births · {stats.deaths} deaths
            </span>
            <span>
              e {stats.avgEnergy.toFixed(2)} · seed {seed}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {Array.from({ length: speciesCount }, (_, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full" style={{ background: colors[i] }} />
                  {stats.bySpecies[i] ?? 0}
                </span>
              ))}
            </span>
          </span>
        ) : null}
      </button>

      <div className="pointer-events-auto flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="icon-sm"
          className="max-md:size-11 max-md:[&_svg]:size-5"
          onClick={onOpenMenu}
          aria-label="Menu"
        >
          <Menu />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          className="max-md:hidden"
          onClick={onTogglePause}
          aria-label={paused ? 'Play' : 'Pause'}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          className="max-md:hidden"
          onClick={onReset}
          aria-label="Reset"
        >
          <RotateCcw />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          className="max-md:size-11 max-md:[&_svg]:size-5"
          onClick={onRandomize}
          aria-label="New universe"
        >
          <Dices />
        </Button>
        <Button
          variant={panelOpen ? 'default' : 'secondary'}
          size="icon-sm"
          className="max-md:hidden"
          onClick={onTogglePanel}
          aria-label="Settings"
        >
          <SlidersHorizontal />
        </Button>
      </div>
    </div>
  )
}
