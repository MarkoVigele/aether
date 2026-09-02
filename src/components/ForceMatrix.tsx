import { cn } from '@/lib/utils'
import { PALETTES } from '@/simulation/palettes'
import type { PaletteId } from '@/simulation/types'
import { useState } from 'react'
import { SliderRow } from './SliderRow'

type ForceMatrixProps = {
  matrix: number[][]
  colors: string[]
  onChange: (matrix: number[][]) => void
}

export function ForceMatrix({ matrix, colors, onChange }: ForceMatrixProps) {
  const n = matrix.length
  const [sel, setSel] = useState<[number, number]>([0, 0])
  const [i, j] = sel
  const value = matrix[i]?.[j] ?? 0

  const setCell = (x: number, y: number, next: number) => {
    onChange(matrix.map((row, ri) => row.map((cell, ci) => (ri === x && ci === y ? next : cell))))
  }

  return (
    <div className="grid gap-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Rows act on columns. Green pulls, rose pushes.
      </p>
      <div className="grid gap-1 md:hidden">
        {matrix.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const t = (cell + 1) / 2
            const bg = `linear-gradient(90deg, rgba(125,211,199,${t * 0.55}), rgba(240,113,139,${(1 - t) * 0.5}))`
            const active = sel[0] === rowIndex && sel[1] === colIndex
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                onClick={() => setSel([rowIndex, colIndex])}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2 text-left',
                  active ? 'border-primary text-foreground' : 'border-white/5 text-foreground/80',
                )}
                style={{ background: bg }}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[rowIndex] }} />
                <span className="text-[10px] text-white/50">→</span>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[colIndex] }} />
                <span className="flex-1 text-xs">
                  {rowIndex + 1} → {colIndex + 1}
                </span>
                <span className="font-mono text-[11px]">{cell.toFixed(2)}</span>
              </button>
            )
          }),
        )}
      </div>
      <div
        className="hidden gap-1 md:grid"
        style={{ gridTemplateColumns: `18px repeat(${n}, minmax(0, 1fr))` }}
      >
        <div />
        {matrix.map((_, col) => (
          <div
            key={`h-${col}`}
            className="flex h-4 items-center justify-center"
            style={{ color: colors[col] }}
          >
            <span className="size-2 rounded-full" style={{ background: colors[col] }} />
          </div>
        ))}
        {matrix.map((row, rowIndex) => (
          <div key={`r-${rowIndex}`} className="contents">
            <div className="flex items-center justify-center">
              <span className="size-2 rounded-full" style={{ background: colors[rowIndex] }} />
            </div>
            {row.map((cell, colIndex) => {
              const t = (cell + 1) / 2
              const bg = `linear-gradient(180deg, rgba(125,211,199,${t * 0.55}), rgba(240,113,139,${(1 - t) * 0.5}))`
              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  onClick={() => setSel([rowIndex, colIndex])}
                  className={cn(
                    'h-8 rounded-md border font-mono text-[10px] transition-colors',
                    sel[0] === rowIndex && sel[1] === colIndex
                      ? 'border-primary text-foreground'
                      : 'border-white/5 text-foreground/80',
                  )}
                  style={{ background: bg }}
                >
                  {cell.toFixed(2)}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <SliderRow
        label={`Force ${i + 1} → ${j + 1}`}
        value={value}
        min={-1}
        max={1}
        step={0.01}
        onChange={(next) => setCell(i, j, next)}
      />
    </div>
  )
}

type EatMatrixProps = {
  matrix: boolean[][]
  colors: string[]
  onChange: (matrix: boolean[][]) => void
}

export function EatMatrix({ matrix, colors, onChange }: EatMatrixProps) {
  return (
    <div className="grid gap-2">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Tap a cell so the row species can feed on the column species.
      </p>
      <div className="grid gap-1 md:hidden">
        {matrix.map((row, rowIndex) =>
          row.map((on, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              type="button"
              onClick={() =>
                onChange(
                  matrix.map((r, ri) =>
                    r.map((c, ci) => (ri === rowIndex && ci === colIndex ? !c : c)),
                  ),
                )
              }
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-medium',
                on
                  ? 'border-primary/40 bg-primary/20 text-primary'
                  : 'border-white/5 bg-white/5 text-muted-foreground',
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[rowIndex] }} />
              <span className="text-[10px] text-white/50">→</span>
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[colIndex] }} />
              <span className="flex-1">
                {rowIndex + 1} → {colIndex + 1}
              </span>
              <span>{on ? 'eat' : '—'}</span>
            </button>
          )),
        )}
      </div>
      <div
        className="hidden gap-1 md:grid"
        style={{ gridTemplateColumns: `18px repeat(${matrix.length}, minmax(0, 1fr))` }}
      >
        <div />
        {matrix.map((_, col) => (
          <div key={`eh-${col}`} className="flex h-4 items-center justify-center">
            <span className="size-2 rounded-full" style={{ background: colors[col] }} />
          </div>
        ))}
        {matrix.map((row, rowIndex) => (
          <div key={`er-${rowIndex}`} className="contents">
            <div className="flex items-center justify-center">
              <span className="size-2 rounded-full" style={{ background: colors[rowIndex] }} />
            </div>
            {row.map((on, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                onClick={() =>
                  onChange(
                    matrix.map((r, ri) =>
                      r.map((c, ci) => (ri === rowIndex && ci === colIndex ? !c : c)),
                    ),
                  )
                }
                className={cn(
                  'h-8 rounded-md border text-[10px] font-medium',
                  on
                    ? 'border-primary/40 bg-primary/20 text-primary'
                    : 'border-white/5 bg-white/5 text-muted-foreground',
                )}
              >
                {on ? 'eat' : '—'}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function speciesColors(palette: PaletteId, count: number) {
  const colors = PALETTES[palette].colors
  return Array.from({ length: count }, (_, i) => colors[i % colors.length])
}
