import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Section({
  title,
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = openProp ?? uncontrolled

  const setOpen = (next: boolean) => {
    onOpenChange?.(next)
    if (openProp === undefined) setUncontrolled(next)
  }

  return (
    <section className="border-b border-white/6 py-2.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center justify-between py-1.5 text-left md:min-h-0"
      >
        <span className="text-[11px] font-semibold tracking-[0.16em] text-foreground/70 uppercase">
          {title}
        </span>
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition', open && 'rotate-180')} />
      </button>
      {open ? <div className="grid gap-3.5 pt-2 pb-2">{children}</div> : null}
    </section>
  )
}
