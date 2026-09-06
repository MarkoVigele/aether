import type { DisplayFps } from './types'

/** Simulation clock: 60 Hz fixed step. Independent of display refresh. */
export const SIM_DT = 1 / 60
export const MAX_FRAME_SEC = 0.25
export const MAX_SIM_STEPS = 4
/** Dense Aurora herds can put hundreds in one cell. Hard cap keeps physics O(N). */
export const MAX_NEIGHBOR_QUERY = 32

/**
 * Cap catch-up from the *current* frame time, not only the lagged HUD FPS.
 * A 40ms frame must not schedule 8 physics steps or the rate locks at ~15.
 */
export function adaptiveMaxSimSteps(fps: number, elapsedSec = 0) {
  if (elapsedSec > 0.042) return 2
  if (elapsedSec > 0.032) return 3
  if (fps > 0 && fps < 24) return 2
  if (fps > 0 && fps < 32) return 3
  return MAX_SIM_STEPS
}

/** Fewer neighbor tests once herds clump and the frame is already late. */
export function neighborQueryCap(fps: number) {
  if (fps > 0 && fps < 22) return 18
  if (fps > 0 && fps < 28) return 24
  return MAX_NEIGHBOR_QUERY
}

/** Skip some particle sprites when the display is struggling. Trails still draw all. */
export function particleSpriteStep(fps: number) {
  if (fps > 0 && fps < 22) return 3
  if (fps > 0 && fps < 28) return 2
  return 1
}

export function isDisplayFps(value: unknown): value is DisplayFps {
  return value === 30 || value === 60 || value === 120 || value === 'auto'
}

export function clampFrameDelta(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return Math.min(seconds, MAX_FRAME_SEC)
}

/** Fold wall time into the sim accumulator. timeScale is a world-speed knob, not a frame-rate knob. */
export function ingestSimTime(acc: number, elapsedSec: number, timeScale: number): number {
  const scale = Number.isFinite(timeScale) ? Math.max(0, timeScale) : 1
  return acc + clampFrameDelta(elapsedSec) * scale
}

/**
 * Consume whole fixed steps. Late frames catch up; dt never changes.
 * If the device cannot keep up, leftover time is clamped (world lags wall clock).
 */
export function takeSimSteps(
  acc: number,
  dt = SIM_DT,
  maxSteps = MAX_SIM_STEPS,
): { acc: number; steps: number } {
  let next = acc
  let steps = 0
  while (next >= dt && steps < maxSteps) {
    next -= dt
    steps++
  }
  if (steps >= maxSteps) next = Math.min(next, dt)
  return { acc: next, steps }
}

export function renderIntervalMs(mode: DisplayFps): number | null {
  if (mode === 'auto') return null
  return 1000 / mode
}

/** Draw this rAF tick? `auto` follows vsync. 30/60/120 cap display only — touch cannot lift the cap. */
export function shouldDrawFrame(now: number, lastDraw: number, mode: DisplayFps, slack = 0.75): boolean {
  const interval = renderIntervalMs(mode)
  if (interval == null) return true
  return now - lastDraw >= interval - slack
}
