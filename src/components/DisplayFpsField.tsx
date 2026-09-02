import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DisplayFps } from '@/simulation/types'

const OPTIONS: { value: string; label: string }[] = [
  { value: '30', label: '30' },
  { value: '60', label: '60' },
  { value: '120', label: '120' },
  { value: 'auto', label: 'Automatisch' },
]

type DisplayFpsFieldProps = {
  value: DisplayFps
  onChange: (value: DisplayFps) => void
}

export function DisplayFpsField({ value, onChange }: DisplayFpsFieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label>Bildrate</Label>
      <Select
        value={value === 'auto' ? 'auto' : String(value)}
        onValueChange={(next) => {
          if (next === 'auto') onChange('auto')
          else if (next === '30') onChange(30)
          else if (next === '120') onChange(120)
          else onChange(60)
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
