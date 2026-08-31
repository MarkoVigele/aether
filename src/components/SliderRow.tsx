import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

type SliderRowProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (value: number) => string
  onChange: (value: number) => void
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 0.01,
  format,
  onChange,
}: SliderRowProps) {
  const shown = format ? format(value) : value.toFixed(step < 1 ? 2 : 0)
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="font-mono text-[11px] text-foreground/80">{shown}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => onChange(next[0] ?? value)}
      />
    </div>
  )
}
