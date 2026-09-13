import { DONATE_HREF, DONATE_LABEL, DONATE_MICRO } from '@/lib/donate'

export function DonateChip() {
  return (
    <div
      className="pointer-events-none absolute z-20 flex justify-start p-2 sm:p-3"
      style={{ bottom: 'var(--dock-space)' }}
    >
      <a
        href={DONATE_HREF}
        target="_blank"
        rel="noopener"
        className="pointer-events-auto group max-w-[16.75rem] rounded-lg border border-white/8 bg-[#07080d]/48 px-2.5 py-1.5 text-left backdrop-blur-sm transition hover:border-white/14 hover:bg-[#07080d]/68 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="block text-[11px] font-medium leading-tight text-white/62 transition-colors group-hover:text-primary">
          {DONATE_LABEL}
        </span>
        <span className="mt-0.5 block text-[10px] leading-snug text-white/38">
          {DONATE_MICRO}
        </span>
      </a>
    </div>
  )
}
