import type { DisplayFps } from './types'

/** Simulation clock: 60 Hz fixed step. Independent of display refresh. */
export const SIM_DT = 1 / 60
export const MAX_FRAME_SEC = 0.25
export const MAX_SIM_STEPS = 8

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
