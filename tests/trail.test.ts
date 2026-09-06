import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyLookQuery,
  trailBufferScale,
  trailCompositeContrast,
  trailDeposit,
  trailFadeAlpha,
  trailPunchByte,
  trailSegmentOk,
} from '../src/simulation/trail.ts'

test('performance buffer is cheaper than full-res', () => {
  assert.equal(trailBufferScale('performance'), 0.78)
  assert.equal(trailBufferScale('balanced'), 1)
  assert.equal(trailBufferScale('beautiful'), 1)
})

test('high trail fades slowly without punch or contrast crush', () => {
  const fade = trailFadeAlpha(0.93)
  assert.ok(fade >= 0.018 && fade <= 0.06)
  assert.equal(trailPunchByte(0.93), 0)
  assert.equal(trailCompositeContrast(0.93), 1)
})

test('mid trail is a short ribbon', () => {
  const fade = trailFadeAlpha(0.5)
  assert.ok(fade >= 0.35 && fade <= 0.55)
  assert.equal(trailPunchByte(0.5), 1)
})

test('low trail clears quickly', () => {
  assert.equal(trailFadeAlpha(0), 1)
  assert.ok(trailFadeAlpha(0.2) > 0.7)
  assert.equal(trailPunchByte(0.2), 3)
})

test('trail slider is monotonic', () => {
  const fades = [0.2, 0.5, 0.72, 0.93, 0.97].map(trailFadeAlpha)
  assert.deepEqual(fades, [...fades].sort((a, b) => b - a))
  const deposits = [0.2, 0.5, 0.72, 0.93].map(trailDeposit)
  assert.deepEqual(deposits, [...deposits].sort((a, b) => a - b))
})

test('wrap jumps do not connect', () => {
  assert.equal(trailSegmentOk(10, 10, 18, 16), true)
  assert.equal(trailSegmentOk(10, 10, 900, 16), false)
  assert.equal(trailSegmentOk(0, 0, 0, 200), false)
})

test('look query overrides trail glow and quality', () => {
  const base = {
    trail: 0.72,
    glow: 0.74,
    quality: 'balanced' as const,
    palette: 'aurora' as const,
  }
  const next = applyLookQuery(base as never, '?trail=0.93&glow=0.74&quality=beautiful')
  assert.equal(next.trail, 0.93)
  assert.equal(next.glow, 0.74)
  assert.equal(next.quality, 'beautiful')
})
