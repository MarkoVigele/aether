import { useEffect, useRef } from 'react'
import { Engine } from '@/simulation/engine'
import { displayDpr, Renderer } from '@/simulation/renderer'
import type { SimSettings, SimStats } from '@/simulation/types'

type SimulationCanvasProps = {
  settings: SimSettings
  paused: boolean
  resetKey: number
  seed: number
  onStats: (stats: SimStats) => void
  dismissOnTap?: boolean
  onFieldTap?: () => void
}

export function SimulationCanvas({
  settings,
  paused,
  resetKey,
  seed,
  onStats,
  dismissOnTap = false,
  onFieldTap,
}: SimulationCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const settingsRef = useRef(settings)
  const pausedRef = useRef(paused)
  const onStatsRef = useRef(onStats)
  const dismissOnTapRef = useRef(dismissOnTap)
  const onFieldTapRef = useRef(onFieldTap)

  settingsRef.current = settings
  pausedRef.current = paused
  onStatsRef.current = onStats
  dismissOnTapRef.current = dismissOnTap
  onFieldTapRef.current = onFieldTap

  const resizeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    engineRef.current?.setSettings(settings)
    resizeRef.current?.()
  }, [settings])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const engine = new Engine(settingsRef.current, seed)
    const renderer = new Renderer()
    engineRef.current = engine
    rendererRef.current = renderer

    let viewW = 1
    let viewH = 1
    let viewDpr = 1

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = displayDpr(settingsRef.current.quality)
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      const nextW = Math.floor(width * dpr)
      const nextH = Math.floor(height * dpr)
      viewW = width
      viewH = height
      viewDpr = dpr
      engine.resize(width, height)
      if (canvas.width === nextW && canvas.height === nextH) return
      canvas.width = nextW
      canvas.height = nextH
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const nextCtx = canvas.getContext('2d')
      if (nextCtx) renderer.clear(nextCtx, width, height, dpr)
    }

    resizeRef.current = resize
    resize()
    engine.reset(seed)

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let frame = 0
    let last = performance.now()
    let frames = 0
    let fpsStamp = last
    let raf = 0

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      frames++
      if (now - fpsStamp > 400) {
        engine.stats.fps = (frames * 1000) / (now - fpsStamp)
        frames = 0
        fpsStamp = now
      }
      try {
        if (!pausedRef.current) engine.step(dt)
        renderer.draw(ctx, engine, settingsRef.current, viewW, viewH, viewDpr)
        if (frame % 20 === 0) onStatsRef.current({ ...engine.stats })
      } catch {
        // Keep the loop alive if a single frame fails.
      }
      frame++
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const observer = new ResizeObserver(resize)
    observer.observe(wrap)

    const toLocal = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const onPointer = (event: PointerEvent) => {
      const { x, y } = toLocal(event)
      engine.mouse.x = x
      engine.mouse.y = y
      engine.mouse.inside = true
      if (event.buttons && settingsRef.current.mouseMode === 'spawn') {
        engine.spawnAt(x, y)
      }
    }

    const onDown = (event: PointerEvent) => {
      if (dismissOnTapRef.current) {
        onFieldTapRef.current?.()
        return
      }
      canvas.setPointerCapture(event.pointerId)
      engine.mouse.down = true
      onPointer(event)
    }
    const onUp = () => {
      engine.mouse.down = false
    }
    const onLeave = () => {
      engine.mouse.inside = false
      engine.mouse.down = false
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onPointer)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.dispose()
      engine.dispose()
      canvas.width = 1
      canvas.height = 1
      engineRef.current = null
      rendererRef.current = null
      resizeRef.current = null
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', resize)
    }
  }, [resetKey, seed])

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair touch-none" />
    </div>
  )
}
