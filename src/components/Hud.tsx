import { Button } from '@/components/ui/button'
import { PALETTES } from '@/simulation/palettes'
import type { PaletteId, SimStats } from '@/simulation/types'
import { Dices, Menu, Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react'

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
  const colors = PALETTES[palette].colors
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-primary/80 uppercase">Aether</p>
          <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            Living particle physics
          </h1>
          <p className="mt-1 hidden max-w-md text-xs leading-relaxed text-white/55 md:block">
            Species attract, hunt, flock, and split. Drag to stir the field.
          </p>
        </div>
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-white/60">
        <span>{stats.fps.toFixed(0)} fps</span>
        <span>{stats.population} alive</span>
        <span>{stats.births} births</span>
        <span>{stats.deaths} deaths</span>
        <span>e {stats.avgEnergy.toFixed(2)}</span>
        <span>seed {seed}</span>
      </div>

      <div className="flex max-w-xl flex-wrap gap-1.5">
        {Array.from({ length: speciesCount }, (_, i) => {
          const count = stats.bySpecies[i] ?? 0
          const total = Math.max(1, stats.population)
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full border border-white/8 bg-black/25 px-2 py-1 backdrop-blur-sm"
            >
              <span className="size-2 rounded-full" style={{ background: colors[i] }} />
              <span className="font-mono text-[10px] text-white/70">{count}</span>
              <span
                className="h-1 w-10 overflow-hidden rounded-full bg-white/10"
                aria-hidden
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(count / total) * 100}%`,
                    background: colors[i],
                  }}
                />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
