import { clamp, hexToRgb } from '@/lib/utils'
import { PALETTES } from './palettes'
import type { Engine } from './engine'
import type { Palette, Particle, QualityLevel, SimSettings } from './types'

const SPRITE = 48

function dropCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  canvas.width = 1
  canvas.height = 1
}

function makeSprite(hex: string) {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE
  canvas.height = SPRITE
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const [r, g, b] = hexToRgb(hex)
  const c = SPRITE / 2
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c)
  glow.addColorStop(0, `rgba(255,255,255,0.92)`)
  glow.addColorStop(0.14, `rgba(${r},${g},${b},0.88)`)
  glow.addColorStop(0.38, `rgba(${r},${g},${b},0.28)`)
  glow.addColorStop(0.7, `rgba(${r},${g},${b},0.06)`)
  glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SPRITE, SPRITE)
  return canvas
}

function trailScale(quality: QualityLevel) {
  if (quality === 'performance') return 0.55
  if (quality === 'beautiful') return 0.9
  return 0.72
}

export function displayDpr(quality: QualityLevel) {
  const raw = window.devicePixelRatio || 1
  if (quality === 'performance') return 1
  if (quality === 'beautiful') return Math.min(raw, 2)
  return Math.min(raw, 1.5)
}

export class Renderer {
  private sprites = new Map<string, HTMLCanvasElement>()
  private palette: Palette = PALETTES.aurora
  private trail: HTMLCanvasElement | null = null
  private trailCtx: CanvasRenderingContext2D | null = null
  private linkQuery: number[] = []

  sprite(hex: string) {
    let cached = this.sprites.get(hex)
    if (!cached) {
      cached = makeSprite(hex)
      this.sprites.set(hex, cached)
    }
    return cached
  }

  draw(
    ctx: CanvasRenderingContext2D,
    engine: Engine,
    settings: SimSettings,
    width: number,
    height: number,
    dpr: number,
  ) {
    this.palette = PALETTES[settings.palette]

    const scale = trailScale(settings.quality)
    const trailCtx = this.ensureTrail(width, height, scale)
    const tw = trailCtx.canvas.width
    const th = trailCtx.canvas.height

    this.decayTrail(trailCtx, tw, th, settings.trail)

    trailCtx.save()
    trailCtx.scale(tw / width, th / height)
    trailCtx.globalCompositeOperation = 'lighter'
    const particles = engine.particles
    for (const p of particles) this.drawParticle(trailCtx, p, settings, 1)
    trailCtx.restore()

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = this.palette.background
    ctx.fillRect(0, 0, width, height)
    // Crush leftover 8-bit haze so stalled dark pixels never show as a veil.
    ctx.filter = 'contrast(1.4) brightness(1.03)'
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(trailCtx.canvas, 0, 0, width, height)
    ctx.filter = 'none'

    ctx.globalCompositeOperation = 'source-over'
    const fpsOk = engine.stats.fps > 26 || engine.stats.fps === 0
    if (settings.showLinks && fpsOk && settings.quality !== 'performance') {
      this.drawLinks(ctx, engine, settings, particles)
    }

    ctx.globalCompositeOperation = 'lighter'
    for (const p of particles) this.drawParticle(ctx, p, settings, 0.42)
    ctx.globalCompositeOperation = 'source-over'

    if (settings.showEnergy) this.drawEnergy(ctx, particles, settings)
  }

  clear(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) {
    this.palette = this.palette ?? PALETTES.aurora
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = this.palette.background
    ctx.fillRect(0, 0, width, height)
    if (this.trailCtx) {
      this.trailCtx.setTransform(1, 0, 0, 1, 0, 0)
      this.trailCtx.globalCompositeOperation = 'source-over'
      this.trailCtx.fillStyle = '#000'
      this.trailCtx.fillRect(0, 0, this.trailCtx.canvas.width, this.trailCtx.canvas.height)
    }
  }

  dispose() {
    for (const sprite of this.sprites.values()) dropCanvas(sprite)
    this.sprites.clear()
    dropCanvas(this.trail)
    this.trail = null
    this.trailCtx = null
    this.linkQuery.length = 0
  }

  private ensureTrail(width: number, height: number, scale: number) {
    const tw = Math.max(1, Math.floor(width * scale))
    const th = Math.max(1, Math.floor(height * scale))
    if (this.trail && this.trailCtx && this.trail.width === tw && this.trail.height === th) {
      return this.trailCtx
    }
    dropCanvas(this.trail)
    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('trail context failed')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, tw, th)
    this.trail = canvas
    this.trailCtx = ctx
    return ctx
  }

  private decayTrail(
    trailCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    trail: number,
  ) {
    const fade = trail <= 0.01 ? 1 : clamp(1 - trail, 0.03, 1)
    trailCtx.setTransform(1, 0, 0, 1, 0, 0)
    trailCtx.globalCompositeOperation = 'source-over'
    trailCtx.fillStyle = `rgba(0,0,0,${fade})`
    trailCtx.fillRect(0, 0, width, height)
    // 8-bit blending stalls a few levels above black. Subtract a constant so
    // abandoned paths reach zero instead of hanging as a gray cobweb.
    trailCtx.globalCompositeOperation = 'difference'
    trailCtx.fillStyle = '#030303'
    trailCtx.fillRect(0, 0, width, height)
  }

  private colorFor(p: Particle) {
    const colors = this.palette.colors
    return colors[p.type % colors.length]
  }

  private drawParticle(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    settings: SimSettings,
    strength: number,
  ) {
    const energyScale = settings.sizeByEnergy ? 0.62 + 0.4 * Math.min(p.energy, 1.6) : 1
    const flash = 1 + p.flash * 0.45
    const size = settings.particleSize * (0.7 + p.mass * 0.35) * energyScale * flash * settings.glow
    const sprite = this.sprite(this.colorFor(p))
    const draw = Math.max(3, size * 4.1 * strength)
    ctx.drawImage(sprite, p.x - draw / 2, p.y - draw / 2, draw, draw)
  }

  private drawLinks(
    ctx: CanvasRenderingContext2D,
    engine: Engine,
    settings: SimSettings,
    particles: Particle[],
  ) {
    const max = settings.linkDistance
    const max2 = max * max
    ctx.lineWidth = 0.6
    const step = particles.length > 420 ? 3 : 2
    for (let i = 0; i < particles.length; i += step) {
      const a = particles[i]
      engine.hash.query(a.x, a.y, max, this.linkQuery)
      let drawn = 0
      const limit = Math.min(this.linkQuery.length, 8)
      for (let q = 0; q < limit && drawn < 2; q++) {
        const j = this.linkQuery[q]
        if (j <= i) continue
        const b = particles[j]
        if (!b) continue
        const [dx, dy] = engine.hash.delta(a.x, a.y, b.x, b.y)
        const d2 = dx * dx + dy * dy
        if (d2 > max2 || d2 < 4) continue
        const t = 1 - Math.sqrt(d2) / max
        const [r, g, bl] = hexToRgb(this.colorFor(a))
        ctx.strokeStyle = `rgba(${r},${g},${bl},${t * 0.14})`
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(a.x + dx, a.y + dy)
        ctx.stroke()
        drawn++
      }
    }
  }

  private drawEnergy(ctx: CanvasRenderingContext2D, particles: Particle[], settings: SimSettings) {
    ctx.lineWidth = 1
    for (const p of particles) {
      const [r, g, b] = hexToRgb(this.colorFor(p))
      const radius = settings.particleSize * 2.1 + Math.min(p.energy, 2) * 2.4
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.16 + Math.min(p.energy, 1) * 0.22})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2 * Math.min(p.energy / 1.6, 1))
      ctx.stroke()
    }
  }
}
