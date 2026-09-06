import type { QualityLevel, SimSettings } from './types'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Skip a stroke when the particle wrapped, respawned, or jumped a huge step. */
export const TRAIL_SEGMENT_LIMIT = 140

/** Default Look slider. High enough for a short colored ribbon, low enough for FPS. */
export const DEFAULT_TRAIL = 0.37

/** Offscreen trail buffer vs. view size. Capped so the canvas cannot balloon. */
export function trailBufferScale(quality: QualityLevel) {
  if (quality === 'performance') return 0.55
  if (quality === 'beautiful') return 0.85
  return 0.7
}

/** Hard pixel cap for the trail canvas (width * height). */
export function trailBufferMaxPixels(quality: QualityLevel) {
  if (quality === 'performance') return 420_000
  if (quality === 'beautiful') return 1_050_000
  return 760_000
}

export function trailBufferScaleForView(
  quality: QualityLevel,
  width: number,
  height: number,
) {
  let scale = trailBufferScale(quality)
  const area = Math.max(1, width) * Math.max(1, height) * scale * scale
  const max = trailBufferMaxPixels(quality)
  if (area > max) scale *= Math.sqrt(max / area)
  return scale
}

/**
 * Black overlay alpha each frame. Floor stays high enough that abandoned
 * paths cannot hang as 8-bit gray fog.
 */
export function trailFadeAlpha(trail: number) {
  if (trail <= 0.01) return 1
  return clamp((1 - trail) ** 1.15, 0.055, 1)
}

/**
 * Constant subtract after the fade. Always at least 1 so stalled 8-bit
 * pixels reach zero. Colored mid-tones of the schleier stay above that floor.
 */
export function trailPunchByte(trail: number) {
  if (trail <= 0.01) return 0
  if (trail < 0.4) return 3
  if (trail < 0.7) return 2
  return 1
}

export function trailCompositeContrast(trail: number) {
  if (trail >= 0.7) return 1
  if (trail < 0.35) return 1.12
  return 1.04
}

export function trailCompositeBrightness(_trail: number) {
  return 1
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
  return 0.14 + clamp(trail, 0, 1) * 0.5
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
  return Math.max(3.6, size * 5.4)
}

export function trailMidWidth(size: number) {
  return Math.max(2, size * 2.8)
}

export function trailCoreWidth(size: number) {
  return Math.max(1.3, size * 1.35)
}

/** Wide faint layer only at high trail — that layer is what becomes gray fog. */
export function trailUseVeilLayer(trail: number, quality: QualityLevel) {
  return quality === 'beautiful' && trail >= 0.7
}

export function trailUseMidLayer(trail: number, quality: QualityLevel) {
  if (quality === 'performance') return false
  return trail >= 0.48
}

/** One 8-bit decay step. Used to prove gray dies while color lasts. */
export function decayOnce(value: number, trail: number) {
  const fade = trailFadeAlpha(trail)
  const kept = Math.round(value * (1 - fade))
  return Math.max(0, kept - trailPunchByte(trail))
}

export function decayStepsToZero(value: number, trail: number, maxSteps = 48) {
  let v = value
  for (let i = 0; i < maxSteps; i++) {
    v = decayOnce(v, trail)
    if (v <= 0) return i + 1
  }
  return maxSteps + 1
}

export function applyLookQuery(settings: SimSettings, search: string): SimSettings {
  if (!search || search === '?') return settings
  const q = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  if (!q.has('trail') && !q.has('glow') && !q.has('quality') && !q.has('palette')) return settings
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
