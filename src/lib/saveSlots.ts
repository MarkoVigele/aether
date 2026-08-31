import { loadPersisted, savePersisted } from '@/lib/persist'
import { cloneSettings, hydrateSettings } from '@/simulation/settings'
import type { SimSettings } from '@/simulation/types'

export const SLOT_COUNT = 6

export type SaveSlot = {
  name: string
  savedAt: number
  settings: SimSettings
}

export function emptySlots(): (SaveSlot | null)[] {
  return Array.from({ length: SLOT_COUNT }, () => null)
}

export function loadSlots(): (SaveSlot | null)[] {
  return loadPersisted().bundle.slots
}

export function persistSlots(slots: (SaveSlot | null)[]) {
  const { bundle } = loadPersisted()
  savePersisted({ ...bundle, slots })
}

export function writeSlot(
  slots: (SaveSlot | null)[],
  index: number,
  settings: SimSettings,
  name: string,
): (SaveSlot | null)[] {
  const next = slots.slice()
  next[index] = {
    name: name.trim() || `Slot ${index + 1}`,
    savedAt: Date.now(),
    settings: cloneSettings(hydrateSettings(settings)),
  }
  persistSlots(next)
  return next
}

export function clearSlot(slots: (SaveSlot | null)[], index: number): (SaveSlot | null)[] {
  const next = slots.slice()
  next[index] = null
  persistSlots(next)
  return next
}
