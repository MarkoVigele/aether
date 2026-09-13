import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DONATE_HREF, DONATE_LABEL, DONATE_MICRO } from '../src/lib/donate.ts'

test('donate link is the Stripe Payment Link with aether reference', () => {
  assert.equal(
    DONATE_HREF,
    'https://donate.stripe.com/eVqfZif6m8veaTEftLeEo00?client_reference_id=aether',
  )
  assert.equal(new URL(DONATE_HREF).searchParams.get('client_reference_id'), 'aether')
})

test('donate copy matches the studio CTA and avoids dash punctuation', () => {
  assert.equal(DONATE_LABEL, 'Projekt unterstützen')
  assert.equal(
    DONATE_MICRO,
    'Demos bleiben free. Wenn du willst, kannst du das Studio kurz unterstützen.',
  )
  for (const text of [DONATE_LABEL, DONATE_MICRO]) {
    assert.equal(text.includes('\u2014'), false)
    assert.equal(text.includes('\u2013'), false)
  }
})
