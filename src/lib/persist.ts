import type { SaveSlot } from '@/lib/saveSlots'
import { defaultSettings, hydrateSettings } from '@/simulation/settings'

const SLOT_COUNT = 6

function emptySlots(): (SaveSlot | null)[] {
  return Array.from({ length: SLOT_COUNT }, () => null)
}

export const SCHEMA_VERSION = 1
export const PERSIST_KEY = 'aether.persist.v1'
const LEGACY_SLOTS_KEY = 'aether.slots.v1'

export type PersistNotice = {
  level: 'info' | 'warning'
  text: string
} | null

export type PersistedBundle = {
  schemaVersion: number
  settings: ReturnType<typeof defaultSettings>
  slots: (SaveSlot | null)[]
  panelOpen: boolean
  presetId: string
}

function hydrateSlot(item: unknown): SaveSlot | null {
  if (!item || typeof item !== 'object') return null
  const raw = item as Partial<SaveSlot>
  if (!raw.settings) return null
  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Saved setup',
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : Date.now(),
    settings: hydrateSettings(raw.settings),
  }
}

function hydrateSlots(raw: unknown): (SaveSlot | null)[] {
  const slots = emptySlots()
  if (!Array.isArray(raw)) return slots
  for (let i = 0; i < SLOT_COUNT; i++) slots[i] = hydrateSlot(raw[i])
  return slots
}

function readLegacySlots(): (SaveSlot | null)[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_SLOTS_KEY)
    if (!raw) return null
    return hydrateSlots(JSON.parse(raw))
  } catch {
    return null
  }
}

export function loadPersisted(): { bundle: PersistedBundle; notice: PersistNotice } {
  const fallback: PersistedBundle = {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    slots: emptySlots(),
    panelOpen: true,
    presetId: 'herds',
  }

  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) {
      const legacy = readLegacySlots()
      if (!legacy) return { bundle: fallback, notice: null }
      const bundle = { ...fallback, slots: legacy }
      localStorage.setItem(PERSIST_KEY, JSON.stringify(bundle))
      return {
        bundle,
        notice: {
          level: 'info',
          text: 'Saved slots from before this update were kept. Live graphics are now stored too.',
        },
      }
    }

    const parsed = JSON.parse(raw) as Partial<PersistedBundle>
    const savedVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : 0

    if (savedVersion > SCHEMA_VERSION) {
      return {
        bundle: {
          schemaVersion: SCHEMA_VERSION,
          settings: hydrateSettings(parsed.settings),
          slots: hydrateSlots(parsed.slots),
          panelOpen: parsed.panelOpen !== false,
          presetId: typeof parsed.presetId === 'string' ? parsed.presetId : 'herds',
        },
        notice: {
          level: 'warning',
          text: 'This copy of Aether is older than your saved data. Compatible settings were kept; some newer options may be missing.',
        },
      }
    }

    if (savedVersion < SCHEMA_VERSION) {
      // Future breaking migrations go here. v1 is the first schema, so we merge.
      const bundle: PersistedBundle = {
        schemaVersion: SCHEMA_VERSION,
        settings: hydrateSettings(parsed.settings),
        slots: hydrateSlots(parsed.slots),
        panelOpen: parsed.panelOpen !== false,
        presetId: typeof parsed.presetId === 'string' ? parsed.presetId : 'herds',
      }
      localStorage.setItem(PERSIST_KEY, JSON.stringify(bundle))
      return {
        bundle,
        notice: {
          level: 'info',
          text: 'Your setups were upgraded for this version. New options use defaults; your old values were kept.',
        },
      }
    }

    return {
      bundle: {
        schemaVersion: SCHEMA_VERSION,
        settings: hydrateSettings(parsed.settings),
        slots: hydrateSlots(parsed.slots),
        panelOpen: parsed.panelOpen !== false,
        presetId: typeof parsed.presetId === 'string' ? parsed.presetId : 'herds',
      },
      notice: null,
    }
  } catch {
    return {
      bundle: fallback,
      notice: {
        level: 'warning',
        text: 'Saved settings could not be read and were reset to defaults. Slots were empty or unreadable.',
      },
    }
  }
}

export function savePersisted(bundle: PersistedBundle) {
  const payload: PersistedBundle = {
    schemaVersion: SCHEMA_VERSION,
    settings: hydrateSettings(bundle.settings),
    slots: hydrateSlots(bundle.slots),
    panelOpen: bundle.panelOpen,
    presetId: bundle.presetId,
  }
  localStorage.setItem(PERSIST_KEY, JSON.stringify(payload))
}

export function bundleFromUnknown(raw: unknown): PersistedBundle {
  const parsed = (raw && typeof raw === 'object' ? raw : {}) as Partial<PersistedBundle>
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: hydrateSettings(parsed.settings),
    slots: hydrateSlots(parsed.slots),
    panelOpen: parsed.panelOpen !== false,
    presetId: typeof parsed.presetId === 'string' ? parsed.presetId : 'imported',
  }
}

export function exportPersistedJson(bundle: PersistedBundle) {
  const payload = {
    kind: 'aether-saves',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: bundle.settings,
    slots: bundle.slots,
    panelOpen: bundle.panelOpen,
    presetId: bundle.presetId,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'aether-saves.json'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
