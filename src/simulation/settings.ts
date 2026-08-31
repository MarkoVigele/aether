import { clamp, mulberry32 } from '@/lib/utils'
import type { SimSettings } from './types'

export const MAX_SPECIES = 8
export const MAX_PARTICLES = 2800

export function emptyMatrix(n: number, fill = 0) {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => fill))
}

export function emptyEatMatrix(n: number) {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => false))
}

export function resizeMatrix(matrix: number[][], n: number, fill = 0) {
  const next = emptyMatrix(n, fill)
  for (let i = 0; i < Math.min(n, matrix.length); i++) {
    for (let j = 0; j < Math.min(n, matrix[i].length); j++) {
      next[i][j] = matrix[i][j]
    }
  }
  for (let i = matrix.length; i < n; i++) next[i][i] = 0.32
  return next
}

export function resizeEatMatrix(matrix: boolean[][], n: number) {
  const next = emptyEatMatrix(n)
  for (let i = 0; i < Math.min(n, matrix.length); i++) {
    for (let j = 0; j < Math.min(n, matrix[i].length); j++) {
      next[i][j] = matrix[i][j]
    }
  }
  return next
}

export function cloneSettings(settings: SimSettings): SimSettings {
  return {
    ...settings,
    forceMatrix: settings.forceMatrix.map((row) => row.slice()),
    eatMatrix: settings.eatMatrix.map((row) => row.slice()),
  }
}

const NUMBER_KEYS = [
  'particleCount',
  'speciesCount',
  'timeScale',
  'friction',
  'maxSpeed',
  'gravity',
  'collision',
  'restitution',
  'forceRadius',
  'forceStrength',
  'repulsion',
  'temperature',
  'viscosity',
  'bounceDamping',
  'energyDecay',
  'photosynthesis',
  'eatRadius',
  'eatRate',
  'eatEfficiency',
  'reproduceEnergy',
  'mutationRate',
  'maxAge',
  'abiogenesis',
  'aiStrength',
  'perception',
  'separation',
  'alignment',
  'cohesion',
  'seek',
  'flee',
  'wander',
  'trail',
  'glow',
  'particleSize',
  'linkDistance',
  'mouseRadius',
  'mouseStrength',
] as const

const BOOL_KEYS = [
  'lifeEnabled',
  'eatEnabled',
  'reproduceEnabled',
  'aiEnabled',
  'sizeByEnergy',
  'showLinks',
  'showEnergy',
] as const

function isPalette(value: unknown): value is SimSettings['palette'] {
  return value === 'aurora' || value === 'ember' || value === 'ocean' || value === 'candy' || value === 'mono'
}

function isQuality(value: unknown): value is SimSettings['quality'] {
  return value === 'performance' || value === 'balanced' || value === 'beautiful'
}

function isBoundary(value: unknown): value is SimSettings['boundary'] {
  return value === 'wrap' || value === 'bounce' || value === 'void'
}

function isGravity(value: unknown): value is SimSettings['gravityMode'] {
  return value === 'none' || value === 'down' || value === 'center'
}

function isMouse(value: unknown): value is SimSettings['mouseMode'] {
  return value === 'attract' || value === 'repel' || value === 'spawn' || value === 'off'
}

/** Merge a saved blob onto current defaults so updates can add fields without wiping user prefs. */
export function hydrateSettings(raw: unknown): SimSettings {
  const next = defaultSettings()
  if (!raw || typeof raw !== 'object') return next
  const saved = raw as Partial<SimSettings>

  for (const key of NUMBER_KEYS) {
    const value = saved[key]
    if (typeof value === 'number' && Number.isFinite(value)) next[key] = value
  }
  for (const key of BOOL_KEYS) {
    const value = saved[key]
    if (typeof value === 'boolean') next[key] = value
  }
  if (isPalette(saved.palette)) next.palette = saved.palette
  if (isQuality(saved.quality)) next.quality = saved.quality
  if (isBoundary(saved.boundary)) next.boundary = saved.boundary
  if (isGravity(saved.gravityMode)) next.gravityMode = saved.gravityMode
  if (isMouse(saved.mouseMode)) next.mouseMode = saved.mouseMode

  next.speciesCount = clamp(Math.round(next.speciesCount), 2, MAX_SPECIES)
  next.particleCount = clamp(Math.round(next.particleCount), 40, MAX_PARTICLES)
  next.forceMatrix = resizeMatrix(
    Array.isArray(saved.forceMatrix) ? saved.forceMatrix : next.forceMatrix,
    next.speciesCount,
  )
  next.eatMatrix = resizeEatMatrix(
    Array.isArray(saved.eatMatrix) ? saved.eatMatrix : next.eatMatrix,
    next.speciesCount,
  )
  return next
}

export function randomForceMatrix(n: number, seed: number, sameSpecies = 0.35) {
  const rng = mulberry32(seed)
  const matrix = emptyMatrix(n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      matrix[i][j] = i === j ? sameSpecies : clamp(rng() * 2 - 1, -1, 1)
    }
  }
  return matrix
}

export function chainEatMatrix(n: number) {
  const eat = emptyEatMatrix(n)
  for (let i = 1; i < n; i++) eat[i][i - 1] = true
  return eat
}

export function defaultSettings(): SimSettings {
  const speciesCount = 4
  return {
    particleCount: 720,
    speciesCount,
    timeScale: 1,

    friction: 0.22,
    maxSpeed: 210,
    gravity: 0,
    gravityMode: 'none',
    collision: 0.55,
    restitution: 0.35,
    forceRadius: 92,
    forceStrength: 420,
    repulsion: 780,
    temperature: 8,
    viscosity: 0.04,
    boundary: 'wrap',
    bounceDamping: 0.72,

    lifeEnabled: true,
    energyDecay: 0.12,
    photosynthesis: 0.2,
    eatEnabled: true,
    eatRadius: 10,
    eatRate: 0.32,
    eatEfficiency: 0.72,
    reproduceEnabled: true,
    reproduceEnergy: 1.55,
    mutationRate: 0.12,
    maxAge: 48,
    abiogenesis: 0.18,

    aiEnabled: true,
    aiStrength: 0.85,
    perception: 78,
    separation: 0.72,
    alignment: 0.46,
    cohesion: 0.38,
    seek: 0.7,
    flee: 0.86,
    wander: 0.22,

    trail: 0.72,
    glow: 0.74,
    particleSize: 2,
    sizeByEnergy: true,
    showLinks: true,
    linkDistance: 36,
    showEnergy: false,
    palette: 'aurora',
    quality: 'balanced',

    mouseMode: 'attract',
    mouseRadius: 140,
    mouseStrength: 520,

    forceMatrix: [
      [0.42, -0.18, 0.12, -0.34],
      [0.55, 0.38, -0.48, 0.08],
      [-0.12, 0.62, 0.28, -0.22],
      [0.16, -0.3, 0.58, 0.4],
    ],
    eatMatrix: [
      [false, false, false, false],
      [true, false, false, false],
      [false, true, false, false],
      [false, false, true, false],
    ],
  }
}

export const PRESETS: { id: string; label: string; blurb: string; apply: () => SimSettings }[] = [
  {
    id: 'herds',
    label: 'Aurora herds',
    blurb: 'Flocking tribes that graze, cluster, and drift.',
    apply: () => defaultSettings(),
  },
  {
    id: 'hunters',
    label: 'Predator garden',
    blurb: 'A three-tier food web with chase and flight.',
    apply: () => {
      const s = defaultSettings()
      s.speciesCount = 3
      s.particleCount = 820
      s.forceMatrix = [
        [0.55, -0.08, -0.4],
        [0.7, 0.32, -0.62],
        [-0.1, 0.78, 0.18],
      ]
      s.eatMatrix = [
        [false, false, false],
        [true, false, false],
        [false, true, false],
      ]
      s.photosynthesis = 0.34
      s.energyDecay = 0.16
      s.seek = 0.92
      s.flee = 1
      s.separation = 0.6
      s.forceStrength = 380
      s.glow = 0.7
      s.particleSize = 1.9
      s.trail = 0.7
      return s
    },
  },
  {
    id: 'cells',
    label: 'Mitosis',
    blurb: 'Sticky cells that feed, swell, and split.',
    apply: () => {
      const s = defaultSettings()
      s.speciesCount = 3
      s.particleCount = 420
      s.forceRadius = 70
      s.forceStrength = 560
      s.repulsion = 920
      s.collision = 0.8
      s.friction = 0.38
      s.maxSpeed = 140
      s.reproduceEnergy = 1.25
      s.photosynthesis = 0.28
      s.energyDecay = 0.08
      s.mutationRate = 0.2
      s.aiStrength = 0.45
      s.showLinks = true
      s.linkDistance = 28
      s.glow = 0.72
      s.particleSize = 2.15
      s.trail = 0.68
      s.forceMatrix = [
        [0.72, 0.18, -0.22],
        [0.2, 0.7, 0.12],
        [-0.15, 0.22, 0.66],
      ]
      s.eatMatrix = [
        [false, false, false],
        [true, false, false],
        [false, true, false],
      ]
      return s
    },
  },
  {
    id: 'orbits',
    label: 'Orbital dance',
    blurb: 'Low drag, central gravity, looping constellations.',
    apply: () => {
      const s = defaultSettings()
      s.lifeEnabled = false
      s.eatEnabled = false
      s.reproduceEnabled = false
      s.gravityMode = 'center'
      s.gravity = 42
      s.friction = 0.04
      s.temperature = 2
      s.maxSpeed = 320
      s.forceRadius = 130
      s.forceStrength = 260
      s.repulsion = 640
      s.viscosity = 0
      s.aiEnabled = false
      s.trail = 0.78
      s.glow = 0.62
      s.particleSize = 1.7
      s.particleCount = 900
      s.speciesCount = 5
      s.forceMatrix = [
        [0.1, 0.55, -0.2, 0.3, -0.15],
        [-0.25, 0.08, 0.6, -0.1, 0.22],
        [0.4, -0.3, 0.05, 0.48, -0.18],
        [-0.12, 0.28, -0.36, 0.12, 0.5],
        [0.32, -0.16, 0.24, -0.4, 0.06],
      ]
      s.eatMatrix = emptyEatMatrix(5)
      s.palette = 'ocean'
      return s
    },
  },
  {
    id: 'soup',
    label: 'Primordial soup',
    blurb: 'High mutation, restless eating, unstable species.',
    apply: () => {
      const s = defaultSettings()
      s.speciesCount = 6
      s.particleCount = 980
      s.mutationRate = 0.38
      s.energyDecay = 0.18
      s.photosynthesis = 0.16
      s.reproduceEnergy = 1.4
      s.temperature = 18
      s.aiStrength = 1
      s.wander = 0.4
      s.forceStrength = 500
      s.forceMatrix = randomForceMatrix(6, 20260821, 0.22)
      s.eatMatrix = chainEatMatrix(6)
      s.palette = 'candy'
      s.trail = 0.66
      s.glow = 0.7
      s.particleSize = 1.85
      return s
    },
  },
  {
    id: 'fireflies',
    label: 'Fireflies',
    blurb: 'Soft wanderers that pulse when they meet.',
    apply: () => {
      const s = defaultSettings()
      s.speciesCount = 3
      s.particleCount = 560
      s.forceRadius = 54
      s.forceStrength = 160
      s.repulsion = 420
      s.friction = 0.28
      s.maxSpeed = 90
      s.temperature = 14
      s.aiEnabled = true
      s.aiStrength = 0.55
      s.wander = 0.7
      s.seek = 0.25
      s.flee = 0.15
      s.alignment = 0.2
      s.cohesion = 0.15
      s.lifeEnabled = true
      s.eatEnabled = false
      s.reproduceEnabled = false
      s.photosynthesis = 0.12
      s.energyDecay = 0.04
      s.glow = 0.82
      s.trail = 0.74
      s.particleSize = 1.65
      s.showLinks = false
      s.palette = 'ember'
      s.forceMatrix = [
        [0.2, 0.12, 0.08],
        [0.1, 0.22, 0.14],
        [0.08, 0.16, 0.18],
      ]
      s.eatMatrix = emptyEatMatrix(3)
      return s
    },
  },
]
