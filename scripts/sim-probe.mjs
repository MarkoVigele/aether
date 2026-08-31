import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Minimal inline probe by spawning vite-node-like eval through the built logic.
// We reimplement just enough by importing compiled-free TS via dynamic register.

const { register } = await import('node:module')
try {
  register('tsx/esm', pathToFileURL('./'))
} catch {
  // fall through
}

async function main() {
  const { Engine } = await import('../src/simulation/engine.ts')
  const { defaultSettings } = await import('../src/simulation/settings.ts')
  const settings = defaultSettings()
  const engine = new Engine(settings, 42)
  engine.resize(1280, 800)
  engine.reset(42)

  let maxNeighbors = 0
  const origQuery = engine.hash.query.bind(engine.hash)
  engine.hash.query = (x, y, r, out) => {
    origQuery(x, y, r, out)
    if (out.length > maxNeighbors) maxNeighbors = out.length
    return out
  }

  const dt = 1 / 60
  for (let t = 0; t <= 6; t += 0.5) {
    const frames = t === 0 ? 0 : 30
    for (let i = 0; i < frames; i++) engine.step(dt)
    let spd = 0
    for (const p of engine.particles) spd += Math.hypot(p.vx, p.vy)
    const n = engine.particles.length || 1
    console.log(
      JSON.stringify({
        t,
        pop: engine.stats.population,
        deaths: engine.stats.deaths,
        births: engine.stats.births,
        avgEnergy: Number(engine.stats.avgEnergy.toFixed(3)),
        avgSpeed: Number((spd / n).toFixed(2)),
        species: engine.stats.bySpecies,
        maxNeighbors,
      }),
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
