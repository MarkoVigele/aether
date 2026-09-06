import type { QualityLevel, SimSettings } from './types'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Skip a stroke when the particle wrapped, respawned, or jumped a huge step. */
export const TRAIL_SEGMENT_LIMIT = 140

/** Offscreen trail buffer vs. view size. Performance stays cheaper; others stay full-res. */
export function trailBufferScale(quality: QualityLevel) {
  if (quality === 'performance') return 0.78
  return 1
}

/**
 * Black overlay alpha each frame. High trail keeps more of the buffer so
 * ribbons persist as a veil instead of collapsing into stamp centers.
 */
export function trailFadeAlpha(trail: number) {
  if (trail <= 0.01) return 1
  return clamp((1 - trail) ** 1.2, 0.018, 1)
}

/**
 * Constant subtract after the fade, to kill 8-bit fog that never reaches zero.
 * High trail skips the punch so mid-tone veil pixels survive.
 */
export function trailPunchByte(trail: number) {
  if (trail <= 0.01 || trail >= 0.68) return 0
  if (trail < 0.38) return 3
  return 1
}

export function trailCompositeContrast(trail: number) {
  if (trail >= 0.68) return 1
  if (trail < 0.35) return 1.22
  return 1.08
}

export function trailCompositeBrightness(trail: number) {
  return trail >= 0.68 ? 1 : 1.02
}

export function trailSegmentOk(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  limit = TRAIL_SEGMENT_LIMIT,
) {
  const dx = x1 - x0
  const dy = y1 - y0
  return dx * dx + dy * dy <= limit * limit
}

/** How much color a frame deposits. Higher trail = denser veil. */
export function trailDeposit(trail: number) {
  return 0.18 + clamp(trail, 0, 1) * 0.62
}

export function trailParticleSize(
  particleSize: number,
  mass: number,
  energy: number,
  flash: number,
  glow: number,
  sizeByEnergy: boolean,
) {
  const energyScale = sizeByEnergy ? 0.62 + 0.4 * Math.min(energy, 1.6) : 1
  const flashScale = 1 + flash * 0.45
  return particleSize * (0.7 + mass * 0.35) * energyScale * flashScale * glow
}

export function trailVeilWidth(size: number) {
  return Math.max(4.2, size * 7.2)
}

export function trailMidWidth(size: number) {
  return Math.max(2.2, size * 3.4)
}

export function trailCoreWidth(size: number) {
  return Math.max(1.4, size * 1.45)
}

export function applyLookQuery(settings: SimSettings, search: string): SimSettings {
  const q = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const next = { ...settings }
  const trail = Number(q.get('trail'))
  if (Number.isFinite(trail)) next.trail = clamp(trail, 0, 0.97)
  const glow = Number(q.get('glow'))
  if (Number.isFinite(glow)) next.glow = clamp(glow, 0.4, 2.2)
  const quality = q.get('quality')
  if (quality === 'performance' || quality === 'balanced' || quality === 'beautiful') {
    next.quality = quality
  }
  const palette = q.get('palette')
  if (
    palette === 'aurora' ||
    palette === 'ember' ||
    palette === 'ocean' ||
    palette === 'candy' ||
    palette === 'mono'
  ) {
    next.palette = palette
  }
  return next
}
