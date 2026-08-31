import type { Palette, PaletteId } from './types'

export const PALETTES: Record<PaletteId, Palette> = {
  aurora: {
    id: 'aurora',
    label: 'Aurora',
    background: '#07080d',
    fade: [7, 8, 13],
    colors: ['#5eead4', '#f472b6', '#fbbf24', '#a78bfa', '#34d399', '#38bdf8', '#fb7185', '#fde68a'],
  },
  ember: {
    id: 'ember',
    label: 'Ember',
    background: '#0c0706',
    fade: [12, 7, 6],
    colors: ['#fb923c', '#f43f5e', '#fbbf24', '#fdba74', '#e11d48', '#f59e0b', '#fb7185', '#fff7ed'],
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    background: '#050a10',
    fade: [5, 10, 16],
    colors: ['#22d3ee', '#38bdf8', '#67e8f9', '#2dd4bf', '#818cf8', '#93c5fd', '#5eead4', '#e0f2fe'],
  },
  candy: {
    id: 'candy',
    label: 'Candy',
    background: '#0a0610',
    fade: [10, 6, 16],
    colors: ['#f472b6', '#c084fc', '#67e8f9', '#fde047', '#fb7185', '#a78bfa', '#4ade80', '#fda4af'],
  },
  mono: {
    id: 'mono',
    label: 'Mono',
    background: '#080808',
    fade: [8, 8, 8],
    colors: ['#f8fafc', '#cbd5e1', '#94a3b8', '#e2e8f0', '#64748b', '#f1f5f9', '#9ca3af', '#ffffff'],
  },
}

export function paletteList() {
  return Object.values(PALETTES)
}
