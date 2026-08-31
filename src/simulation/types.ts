export type BoundaryMode = 'wrap' | 'bounce' | 'void'
export type GravityMode = 'none' | 'down' | 'center'
export type MouseMode = 'attract' | 'repel' | 'spawn' | 'off'
export type PaletteId = 'aurora' | 'ember' | 'ocean' | 'candy' | 'mono'
export type QualityLevel = 'performance' | 'balanced' | 'beautiful'

export type SimSettings = {
  particleCount: number
  speciesCount: number
  timeScale: number

  friction: number
  maxSpeed: number
  gravity: number
  gravityMode: GravityMode
  collision: number
  restitution: number
  forceRadius: number
  forceStrength: number
  repulsion: number
  temperature: number
  viscosity: number
  boundary: BoundaryMode
  bounceDamping: number

  lifeEnabled: boolean
  energyDecay: number
  photosynthesis: number
  eatEnabled: boolean
  eatRadius: number
  eatRate: number
  eatEfficiency: number
  reproduceEnabled: boolean
  reproduceEnergy: number
  mutationRate: number
  maxAge: number
  abiogenesis: number

  aiEnabled: boolean
  aiStrength: number
  perception: number
  separation: number
  alignment: number
  cohesion: number
  seek: number
  flee: number
  wander: number

  trail: number
  glow: number
  particleSize: number
  sizeByEnergy: boolean
  showLinks: boolean
  linkDistance: number
  showEnergy: boolean
  palette: PaletteId
  quality: QualityLevel

  mouseMode: MouseMode
  mouseRadius: number
  mouseStrength: number

  forceMatrix: number[][]
  eatMatrix: boolean[][]
}

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  ax: number
  ay: number
  mass: number
  radius: number
  energy: number
  age: number
  type: number
  wander: number
  metabolism: number
  aggression: number
  sociability: number
  perception: number
  fertility: number
  speedBias: number
  hue: number
  generation: number
  flash: number
}

export type SimStats = {
  fps: number
  population: number
  births: number
  deaths: number
  avgEnergy: number
  avgAge: number
  bySpecies: number[]
}

export type Palette = {
  id: PaletteId
  label: string
  background: string
  fade: [number, number, number]
  colors: string[]
}
