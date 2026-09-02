import { clamp, mulberry32 } from '@/lib/utils'
import { MAX_PARTICLES, resizeEatMatrix, resizeMatrix } from './settings'
import { SpatialHash } from './spatialHash'
import type { Particle, SimSettings, SimStats } from './types'

const MAX_NEIGHBORS = 42

function interactionForce(r: number, attraction: number, beta = 0.3) {
  if (r <= 0 || r >= 1) return 0
  if (r < beta) return r / beta - 1
  const mid = (1 + beta) / 2
  const half = (1 - beta) / 2
  return attraction * (1 - Math.abs(r - mid) / half)
}

function makeParticle(): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    mass: 1,
    radius: 3,
    energy: 1,
    age: 0,
    type: 0,
    wander: 0,
    metabolism: 1,
    aggression: 0.5,
    sociability: 0.5,
    perception: 1,
    fertility: 0.5,
    speedBias: 1,
    hue: 0,
    generation: 0,
    flash: 0,
  }
}

export class Engine {
  particles: Particle[] = []
  settings: SimSettings
  width = 800
  height = 600
  hash = new SpatialHash()
  mouse = { x: 0, y: 0, down: false, inside: false }
  stats: SimStats = {
    fps: 0,
    population: 0,
    births: 0,
    deaths: 0,
    avgEnergy: 0,
    avgAge: 0,
    bySpecies: [],
  }
  seed: number
  private rng: () => number
  private query: number[] = []
  private birthsThisStep = 0
  private deathsThisStep = 0
  private spawnAcc = 0
  private totalBirths = 0
  private totalDeaths = 0
  private pool: Particle[] = []
  private birthBuf: Particle[] = []

  constructor(settings: SimSettings, seed = Date.now() % 1_000_000) {
    this.settings = settings
    this.seed = seed
    this.rng = mulberry32(seed)
  }

  resize(width: number, height: number) {
    this.width = Math.max(64, width)
    this.height = Math.max(64, height)
  }

  setSettings(settings: SimSettings) {
    const next = {
      ...settings,
      forceMatrix: resizeMatrix(settings.forceMatrix, settings.speciesCount),
      eatMatrix: resizeEatMatrix(settings.eatMatrix, settings.speciesCount),
    }
    this.settings = next
    const max = Math.min(MAX_PARTICLES, Math.floor(next.particleCount))
    if (this.particles.length > max) {
      for (let i = max; i < this.particles.length; i++) this.release(this.particles[i])
      this.particles.length = max
    } else if (!next.lifeEnabled) {
      while (this.particles.length < max) this.spawnRandom()
    }
    for (const p of this.particles) {
      p.type = p.type % next.speciesCount
    }
  }

  reset(seed = Date.now() % 1_000_000) {
    this.seed = seed
    this.rng = mulberry32(seed)
    for (const p of this.particles) this.release(p)
    this.particles.length = 0
    this.totalBirths = 0
    this.totalDeaths = 0
    this.stats.births = 0
    this.stats.deaths = 0
    const count = Math.min(MAX_PARTICLES, Math.floor(this.settings.particleCount))
    for (let i = 0; i < count; i++) this.spawnRandom()
    this.refreshStats()
  }

  randomizeUniverse() {
    const seed = (Math.random() * 1_000_000) | 0
    this.reset(seed)
  }

  spawnAt(x: number, y: number, type?: number) {
    if (this.particles.length >= Math.min(MAX_PARTICLES, this.settings.particleCount)) return
    const p = this.birth(x, y, type ?? this.pickType(), 1)
    p.energy = 0.9 + this.rng() * 0.4
  }

  step(dt: number) {
    this.birthsThisStep = 0
    this.deathsThisStep = 0
    this.substep(dt)
    this.refreshStats()
  }

  private substep(dt: number) {
    const s = this.settings
    const cell = Math.max(24, Math.max(s.forceRadius, s.perception) * 0.55)
    this.hash.resize(this.width, this.height, cell, s.boundary === 'wrap')
    this.hash.clear()
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      this.hash.insert(i, p.x, p.y)
      p.ax = 0
      p.ay = 0
      p.flash = Math.max(0, p.flash - dt * 3.2)
    }

    this.applyForces(dt)
    this.integrate(dt)
    this.applyLife(dt)
  }

  private applyForces(dt: number) {
    const s = this.settings
    const radius = s.forceRadius
    const perceive = s.perception
    const queryR = Math.max(radius, perceive, s.eatRadius + 8)
    const mouseR2 = s.mouseRadius * s.mouseRadius

    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i]
      this.hash.query(a.x, a.y, queryR, this.query)

      let sepX = 0
      let sepY = 0
      let aliX = 0
      let aliY = 0
      let cohX = 0
      let cohY = 0
      let flockN = 0
      let viscX = 0
      let viscY = 0
      let viscN = 0
      let seekX = 0
      let seekY = 0
      let seekBest = Infinity
      let fleeX = 0
      let fleeY = 0
      let prey: Particle | null = null
      let preyDist = Infinity
      const stride = Math.max(1, Math.ceil(this.query.length / MAX_NEIGHBORS))

      for (let q = 0; q < this.query.length; q++) {
        const j = this.query[q]
        if (j === i) continue
        const b = this.particles[j]
        if (!b) continue
        const [dx, dy] = this.hash.delta(a.x, a.y, b.x, b.y)
        const dist2 = dx * dx + dy * dy
        if (dist2 < 1e-6) continue
        const dist = Math.sqrt(dist2)
        const minDist = (a.radius + b.radius) * 1.15
        const close = dist < minDist || dist < s.eatRadius
        if (!close && q % stride !== 0) continue
        const nx = dx / dist
        const ny = dy / dist

        if (dist < radius) {
          const row = s.forceMatrix[a.type]
          const attraction = row?.[b.type] ?? 0
          const force = interactionForce(dist / radius, attraction)
          const mag = force * s.forceStrength
          a.ax += nx * mag
          a.ay += ny * mag
        }

        if (dist < minDist) {
          const overlap = minDist - dist
          const push = s.repulsion * overlap
          a.ax -= nx * push
          a.ay -= ny * push

          if (s.collision > 0) {
            const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
            if (rel < 0) {
              const inv = 1 / (a.mass + b.mass)
              const impulse = -(1 + s.restitution) * rel * b.mass * inv * s.collision
              a.vx += impulse * nx
              a.vy += impulse * ny
            }
            const corr = overlap * 0.28 * s.collision
            a.x -= nx * corr
            a.y -= ny * corr
          }
        }

        if (dist < 42) {
          viscX += b.vx
          viscY += b.vy
          viscN++
        }

        if (s.aiEnabled && dist < perceive * a.perception) {
          if (b.type === a.type) {
            const inv = 1 / Math.max(dist, 4)
            sepX -= nx * inv
            sepY -= ny * inv
            aliX += b.vx
            aliY += b.vy
            cohX += dx
            cohY += dy
            flockN++
          }

          if (s.eatEnabled && s.eatMatrix[a.type]?.[b.type] && dist < seekBest) {
            seekBest = dist
            seekX = nx
            seekY = ny
          }
          if (s.eatEnabled && s.eatMatrix[b.type]?.[a.type]) {
            const w = 1 / Math.max(dist, 8)
            fleeX -= nx * w
            fleeY -= ny * w
          }
        }

        if (s.eatEnabled && dist < s.eatRadius && s.eatMatrix[a.type]?.[b.type] && dist < preyDist) {
          preyDist = dist
          prey = b
        }
      }

      if (prey && s.eatEnabled) {
        const bite = Math.min(s.eatRate * dt, Math.max(0, prey.energy - 0.05))
        if (bite > 0) {
          a.energy += bite * s.eatEfficiency
          prey.energy -= bite
          a.flash = Math.max(a.flash, 0.8)
        }
      }

      if (s.viscosity > 0 && viscN > 0) {
        a.vx += ((viscX / viscN - a.vx) * s.viscosity) * 8 * dt
        a.vy += ((viscY / viscN - a.vy) * s.viscosity) * 8 * dt
      }

      if (s.aiEnabled) {
        let sx = 0
        let sy = 0
        if (flockN > 0) {
          sx += sepX * s.separation * 140 * a.sociability
          sy += sepY * s.separation * 140 * a.sociability
          sx += (aliX / flockN - a.vx) * s.alignment * 2.2 * a.sociability
          sy += (aliY / flockN - a.vy) * s.alignment * 2.2 * a.sociability
          sx += (cohX / flockN) * s.cohesion * 1.6 * a.sociability
          sy += (cohY / flockN) * s.cohesion * 1.6 * a.sociability
        }
        sx += seekX * s.seek * 180 * a.aggression
        sy += seekY * s.seek * 180 * a.aggression
        sx += fleeX * s.flee * 220
        sy += fleeY * s.flee * 220

        a.wander += (this.rng() - 0.5) * 7 * dt
        sx += Math.cos(a.wander) * s.wander * 70
        sy += Math.sin(a.wander) * s.wander * 70

        a.ax += sx * s.aiStrength
        a.ay += sy * s.aiStrength
      }

      if (s.gravityMode === 'down') a.ay += s.gravity * 18
      if (s.gravityMode === 'center') {
        const gx = this.width * 0.5 - a.x
        const gy = this.height * 0.5 - a.y
        a.ax += gx * s.gravity * 0.08
        a.ay += gy * s.gravity * 0.08
      }

      if (this.mouse.inside && this.mouse.down && s.mouseMode !== 'off' && s.mouseMode !== 'spawn') {
        const [mdx, mdy] = this.hash.delta(a.x, a.y, this.mouse.x, this.mouse.y)
        const md2 = mdx * mdx + mdy * mdy
        if (md2 < mouseR2 && md2 > 4) {
          const md = Math.sqrt(md2)
          const falloff = 1 - md / s.mouseRadius
          const dir = s.mouseMode === 'attract' ? 1 : -1
          const mag = dir * s.mouseStrength * falloff * falloff
          a.ax += (mdx / md) * mag
          a.ay += (mdy / md) * mag
        }
      }
    }
  }

  private dead = new Set<number>()

  private integrate(dt: number) {
    const s = this.settings
    const damp = Math.exp(-s.friction * 3.4 * dt)
    const noise = s.temperature * Math.sqrt(dt)

    for (const p of this.particles) {
      p.vx += (p.ax / p.mass) * dt
      p.vy += (p.ay / p.mass) * dt
      p.vx *= damp
      p.vy *= damp
      if (noise > 0) {
        p.vx += (this.rng() - 0.5) * 2 * noise
        p.vy += (this.rng() - 0.5) * 2 * noise
      }
      const max = s.maxSpeed * p.speedBias
      const spd = Math.hypot(p.vx, p.vy)
      if (spd > max && spd > 0) {
        p.vx = (p.vx / spd) * max
        p.vy = (p.vy / spd) * max
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (!Number.isFinite(p.vx) || !Number.isFinite(p.vy) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        p.vx = 0
        p.vy = 0
        p.ax = 0
        p.ay = 0
        p.x = this.rng() * this.width
        p.y = this.rng() * this.height
      }
      this.applyBoundary(p)
    }
  }

  private applyBoundary(p: Particle) {
    const s = this.settings
    if (s.boundary === 'wrap') {
      if (p.x < 0) p.x += this.width
      else if (p.x >= this.width) p.x -= this.width
      if (p.y < 0) p.y += this.height
      else if (p.y >= this.height) p.y -= this.height
      return
    }
    if (s.boundary === 'bounce') {
      const pad = p.radius
      if (p.x < pad) {
        p.x = pad
        p.vx = Math.abs(p.vx) * s.bounceDamping
      } else if (p.x > this.width - pad) {
        p.x = this.width - pad
        p.vx = -Math.abs(p.vx) * s.bounceDamping
      }
      if (p.y < pad) {
        p.y = pad
        p.vy = Math.abs(p.vy) * s.bounceDamping
      } else if (p.y > this.height - pad) {
        p.y = this.height - pad
        p.vy = -Math.abs(p.vy) * s.bounceDamping
      }
      return
    }
    if (p.x < -20 || p.x > this.width + 20 || p.y < -20 || p.y > this.height + 20) {
      p.energy = 0
    }
  }

  private applyLife(dt: number) {
    const s = this.settings
    this.dead.clear()

    if (!s.lifeEnabled) {
      const target = Math.min(MAX_PARTICLES, Math.floor(s.particleCount))
      while (this.particles.length < target) this.spawnRandom()
      return
    }

    const max = Math.min(MAX_PARTICLES, Math.floor(s.particleCount))
    const births = this.birthBuf
    births.length = 0

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      const producer = !s.eatMatrix[p.type]?.some(Boolean)
      const gain = producer ? s.photosynthesis : s.photosynthesis * 0.12
      p.energy += (gain - s.energyDecay * p.metabolism) * dt
      p.age += dt

      if (p.energy <= 0.02 || (s.maxAge > 0 && p.age > s.maxAge * (0.7 + p.fertility * 0.6))) {
        this.dead.add(i)
        continue
      }

      if (
        s.reproduceEnabled &&
        p.energy > s.reproduceEnergy &&
        p.age > 2.2 &&
        this.particles.length + births.length < max &&
        this.rng() < p.fertility * 0.55 * dt
      ) {
        const child = this.makeChild(p)
        p.energy *= 0.48
        p.flash = 1
        births.push(child)
      }
    }

    if (this.dead.size) {
      let write = 0
      for (let i = 0; i < this.particles.length; i++) {
        if (this.dead.has(i)) {
          this.release(this.particles[i])
          this.deathsThisStep++
          this.totalDeaths++
        } else {
          this.particles[write] = this.particles[i]
          write++
        }
      }
      this.particles.length = write
    }

    for (const child of births) {
      this.particles.push(child)
      this.birthsThisStep++
      this.totalBirths++
    }

    const floor = Math.max(24, Math.floor(max * 0.22))
    if (this.particles.length < floor && s.abiogenesis > 0) {
      this.spawnAcc += Math.max(s.abiogenesis, 0.2) * dt * 14
      while (this.spawnAcc >= 1 && this.particles.length < max) {
        this.spawnAcc -= 1
        this.spawnRandom(true)
        this.birthsThisStep++
        this.totalBirths++
      }
    }
  }

  private refreshStats() {
    const n = this.particles.length
    const count = this.settings.speciesCount
    if (this.stats.bySpecies.length !== count) this.stats.bySpecies = Array.from({ length: count }, () => 0)
    else this.stats.bySpecies.fill(0)
    let energy = 0
    let age = 0
    for (const p of this.particles) {
      this.stats.bySpecies[p.type] = (this.stats.bySpecies[p.type] ?? 0) + 1
      energy += p.energy
      age += p.age
    }
    this.stats.population = n
    this.stats.avgEnergy = n ? energy / n : 0
    this.stats.avgAge = n ? age / n : 0
    this.stats.births = this.totalBirths
    this.stats.deaths = this.totalDeaths
  }

  private spawnRandom(producerOnly = false) {
    const type = producerOnly ? this.pickProducer() : this.pickType()
    this.birth(this.rng() * this.width, this.rng() * this.height, type, 0)
  }

  dispose() {
    for (const p of this.particles) this.release(p)
    this.particles.length = 0
    this.pool.length = 0
    this.birthBuf.length = 0
    this.query.length = 0
    this.hash.clear()
  }

  private acquire() {
    return this.pool.pop() ?? makeParticle()
  }

  private release(particle: Particle) {
    if (this.pool.length < MAX_PARTICLES + 32) this.pool.push(particle)
  }

  private birth(x: number, y: number, type: number, generation: number) {
    const p = this.acquire()
    p.x = x
    p.y = y
    p.type = type
    p.generation = generation
    p.mass = 0.75 + this.rng() * 0.7
    p.radius = 2.2 + p.mass * 1.1
    p.energy = 0.55 + this.rng() * 0.5
    p.age = this.rng() * 1.5
    p.vx = (this.rng() - 0.5) * 30
    p.vy = (this.rng() - 0.5) * 30
    p.wander = this.rng() * Math.PI * 2
    p.metabolism = 0.7 + this.rng() * 0.6
    p.aggression = this.rng()
    p.sociability = this.rng()
    p.perception = 0.7 + this.rng() * 0.6
    p.fertility = 0.35 + this.rng() * 0.6
    p.speedBias = 0.75 + this.rng() * 0.5
    p.hue = (this.rng() - 0.5) * 18
    p.flash = 0
    this.particles.push(p)
    return p
  }

  private makeChild(parent: Particle) {
    const p = this.acquire()
    const jitter = 7
    p.x = parent.x + (this.rng() - 0.5) * jitter
    p.y = parent.y + (this.rng() - 0.5) * jitter
    p.vx = parent.vx * 0.4 + (this.rng() - 0.5) * 20
    p.vy = parent.vy * 0.4 + (this.rng() - 0.5) * 20
    const mutateType = this.rng() < this.settings.mutationRate * 0.25
    p.type = mutateType
      ? (parent.type + 1 + ((this.rng() * (this.settings.speciesCount - 1)) | 0)) %
        this.settings.speciesCount
      : parent.type
    p.generation = parent.generation + 1
    p.mass = this.mutate(parent.mass, 0.15, 0.5, 1.6)
    p.radius = 2.2 + p.mass * 1.1
    p.energy = parent.energy * 0.42
    p.metabolism = this.mutate(parent.metabolism, 1, 0.35, 1.6)
    p.aggression = this.mutate(parent.aggression, 1, 0.05, 1)
    p.sociability = this.mutate(parent.sociability, 1, 0.05, 1)
    p.perception = this.mutate(parent.perception, 1, 0.4, 1.6)
    p.fertility = this.mutate(parent.fertility, 1, 0.1, 1)
    p.speedBias = this.mutate(parent.speedBias, 1, 0.5, 1.6)
    p.hue = clamp(parent.hue + (this.rng() - 0.5) * 10, -24, 24)
    p.wander = this.rng() * Math.PI * 2
    p.flash = 1
    return p
  }

  private mutate(value: number, scale: number, min: number, max: number) {
    const amp = this.settings.mutationRate * scale
    return clamp(value + (this.rng() - 0.5) * 2 * amp, min, max)
  }

  private pickType() {
    return (this.rng() * this.settings.speciesCount) | 0
  }

  private pickProducer() {
    const eat = this.settings.eatMatrix
    for (let i = 0; i < this.settings.speciesCount; i++) {
      if (!eat[i]?.some(Boolean)) return i
    }
    return 0
  }
}
