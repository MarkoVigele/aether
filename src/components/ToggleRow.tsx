import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

type ToggleRowProps = {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}

export function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
