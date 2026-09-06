import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  adaptiveMaxSimSteps,
  neighborQueryCap,
  particleSpriteStep,
} from '../src/simulation/clock.ts'
import {
  applyLookQuery,
  decayStepsToZero,
  DEFAULT_TRAIL,
  displayDprFor,
  trailBufferMaxPixels,
  trailBufferScale,
  trailBufferScaleForView,
  trailBufferSize,
  trailDeposit,
  trailFadeAlpha,
  trailNeedsPunch,
  trailPunchByte,
  trailSegmentOk,
  trailUseMidLayer,
  trailUseVeilLayer,
} from '../src/simulation/trail.ts'

test('default trail is gentle', () => {
  assert.equal(DEFAULT_TRAIL, 0.37)
})

test('buffer stays below full-res and has a pixel cap', () => {
  assert.equal(trailBufferScale('performance'), 0.48)
  assert.equal(trailBufferScale('balanced'), 0.56)
  assert.equal(trailBufferScale('beautiful'), 0.72)
  assert.ok(trailBufferMaxPixels('balanced') <= 400_000)
  const huge = trailBufferScaleForView('beautiful', 4000, 3000)
  assert.ok(huge * 4000 * huge * 3000 <= trailBufferMaxPixels('beautiful') + 1)
  const a = trailBufferSize('balanced', 800, 600)
  const b = trailBufferSize('balanced', 803, 602)
  assert.deepEqual(a, b)
})

test('phone dpr stays at 1', () => {
  assert.equal(displayDprFor(3, 'balanced', true), 1)
  assert.equal(displayDprFor(2, 'balanced', false), 1.25)
})

test('late frames do not catch up with eight sim steps', () => {
  assert.equal(adaptiveMaxSimSteps(0), 4)
  assert.equal(adaptiveMaxSimSteps(60), 4)
  assert.equal(adaptiveMaxSimSteps(30, 0.05), 2)
  assert.equal(adaptiveMaxSimSteps(24), 3)
  assert.equal(adaptiveMaxSimSteps(12), 2)
})

test('herd neighbor queries stay capped as flocks form', () => {
  assert.equal(neighborQueryCap(0), 32)
  assert.equal(neighborQueryCap(60), 32)
  assert.equal(neighborQueryCap(26), 24)
  assert.equal(neighborQueryCap(18), 18)
  assert.ok(neighborQueryCap(18) < neighborQueryCap(60))
})

test('sprites thin only when the display is already late', () => {
  assert.equal(particleSpriteStep(0), 1)
  assert.equal(particleSpriteStep(40), 1)
  assert.equal(particleSpriteStep(26), 2)
  assert.equal(particleSpriteStep(18), 3)
})

test('default fade kills gray without a difference punch', () => {
  assert.equal(trailNeedsPunch(0.37), false)
  assert.equal(trailNeedsPunch(0.93), true)
  let v = 8
  for (let i = 0; i < 6; i++) {
    v = Math.round(v * (1 - trailFadeAlpha(0.37)))
  }
  assert.equal(v, 0)
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
