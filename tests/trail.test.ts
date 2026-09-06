import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adaptiveMaxSimSteps } from '../src/simulation/clock.ts'
import {
  applyLookQuery,
  decayStepsToZero,
  DEFAULT_TRAIL,
  trailBufferMaxPixels,
  trailBufferScale,
  trailBufferScaleForView,
  trailBufferSize,
  trailDeposit,
  trailFadeAlpha,
  trailPunchByte,
  trailSegmentOk,
  trailUseMidLayer,
  trailUseVeilLayer,
} from '../src/simulation/trail.ts'

test('default trail is gentle', () => {
  assert.equal(DEFAULT_TRAIL, 0.37)
})

test('buffer stays below full-res and has a pixel cap', () => {
  assert.equal(trailBufferScale('performance'), 0.55)
  assert.equal(trailBufferScale('balanced'), 0.7)
  assert.equal(trailBufferScale('beautiful'), 0.85)
  assert.ok(trailBufferMaxPixels('balanced') <= 760_000)
  const huge = trailBufferScaleForView('beautiful', 4000, 3000)
  assert.ok(huge * 4000 * huge * 3000 <= trailBufferMaxPixels('beautiful') + 1)
  const a = trailBufferSize('balanced', 800, 600)
  const b = trailBufferSize('balanced', 803, 602)
  assert.deepEqual(a, b)
})

test('late frames do not catch up with eight sim steps', () => {
  assert.equal(adaptiveMaxSimSteps(0), 8)
  assert.equal(adaptiveMaxSimSteps(60), 8)
  assert.equal(adaptiveMaxSimSteps(24), 3)
  assert.equal(adaptiveMaxSimSteps(12), 2)
})

test('gray fog dies; colored schleier outlasts it', () => {
  assert.equal(trailPunchByte(0.37), 3)
  assert.ok(decayStepsToZero(8, 0.37) <= 3)
  assert.ok(decayStepsToZero(6, 0.93) <= 12)
  assert.ok(decayStepsToZero(80, 0.93) > decayStepsToZero(6, 0.93))
  assert.ok(decayStepsToZero(80, 0.93) >= 8)
})

test('high trail still punches and has a fade floor', () => {
  const fade = trailFadeAlpha(0.93)
  assert.ok(fade >= 0.055 && fade <= 0.12)
  assert.equal(trailPunchByte(0.93), 1)
})

test('mid trail is a short ribbon', () => {
  const fade = trailFadeAlpha(0.5)
  assert.ok(fade >= 0.4 && fade <= 0.6)
  assert.equal(trailPunchByte(0.5), 2)
})

test('low trail clears quickly', () => {
  assert.equal(trailFadeAlpha(0), 1)
  assert.ok(trailFadeAlpha(0.2) > 0.7)
  assert.equal(trailPunchByte(0.2), 3)
})

test('trail slider is monotonic', () => {
  const fades = [0.2, 0.37, 0.5, 0.72, 0.93].map(trailFadeAlpha)
  assert.deepEqual(fades, [...fades].sort((a, b) => b - a))
  const deposits = [0.2, 0.37, 0.72, 0.93].map(trailDeposit)
  assert.deepEqual(deposits, [...deposits].sort((a, b) => a - b))
})

test('wide veil layer only at high beautiful', () => {
  assert.equal(trailUseVeilLayer(0.37, 'balanced'), false)
  assert.equal(trailUseVeilLayer(0.93, 'balanced'), false)
  assert.equal(trailUseVeilLayer(0.93, 'beautiful'), true)
  assert.equal(trailUseMidLayer(0.37, 'balanced'), false)
  assert.equal(trailUseMidLayer(0.6, 'balanced'), true)
})

test('wrap jumps do not connect', () => {
  assert.equal(trailSegmentOk(10, 10, 18, 16), true)
  assert.equal(trailSegmentOk(10, 10, 900, 16), false)
  assert.equal(trailSegmentOk(0, 0, 0, 200), false)
})

test('look query overrides trail glow and quality', () => {
  const base = {
    trail: 0.37,
    glow: 0.74,
    quality: 'balanced' as const,
    palette: 'aurora' as const,
  }
  const next = applyLookQuery(base as never, '?trail=0.93&glow=0.74&quality=beautiful')
  assert.equal(next.trail, 0.93)
  assert.equal(next.glow, 0.74)
  assert.equal(next.quality, 'beautiful')
  assert.equal(applyLookQuery(base as never, ''), base)
})
