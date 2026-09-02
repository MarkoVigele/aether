import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const TAP_PX = 10
const CLOSE_PX = 56
const SNAP_PX = 40
const FLICK_PX_MS = 0.32

export type SheetStage = 'closed' | 'mid' | 'high'

function closedTranslate() {
  return 'translateY(calc(100% + var(--dock-space) + 0.75rem))'
}

export function stageTranslate(stage: SheetStage) {
  if (stage === 'closed') return closedTranslate()
  if (stage === 'mid') return 'translateY(var(--sheet-lift))'
  return 'translateY(0px)'
}

function measureLift(node: HTMLElement) {
  const rect = node.getBoundingClientRect()
  const high = rect.height
  const mid = window.innerHeight * 0.42
  return Math.max(0, high - mid)
}

function measureClosed(node: HTMLElement) {
  const dock = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-space')) || 56
  return node.getBoundingClientRect().height + dock + 12
}

function originY(stage: SheetStage, node: HTMLElement) {
  if (stage === 'high') return 0
  if (stage === 'mid') return measureLift(node)
  return measureClosed(node)
}

function stepStage(stage: SheetStage, direction: 'up' | 'down'): SheetStage {
  if (direction === 'up') {
    if (stage === 'closed') return 'mid'
    if (stage === 'mid') return 'high'
    return 'high'
  }
  if (stage === 'high') return 'mid'
  return 'closed'
}

export function useSnapSheet(
  enabled: boolean,
  stage: SheetStage,
  onStage: (next: SheetStage) => void,
) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef(stage)
  const onStageRef = useRef(onStage)
  stageRef.current = stage
  onStageRef.current = onStage

  const applyStage = useCallback((next: SheetStage) => {
    const node = sheetRef.current
    if (node) {
      node.style.transition = 'transform 300ms'
      node.style.transform = stageTranslate(next)
    }
    onStageRef.current(next)
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return
      const node = sheetRef.current
      if (!node) return
      event.preventDefault()
      event.stopPropagation()

      const startY = event.clientY
      let lastY = event.clientY
      let lastT = event.timeStamp
      let velocity = 0
      let offset = 0
      const base = originY(stageRef.current, node)

      node.style.transition = 'none'
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)

      const onMove = (moveEvent: PointerEvent) => {
        const dy = moveEvent.clientY - startY
        const dt = Math.max(1, moveEvent.timeStamp - lastT)
        velocity = (moveEvent.clientY - lastY) / dt
        lastY = moveEvent.clientY
        lastT = moveEvent.timeStamp
        offset = dy
        const closed = measureClosed(node)
        const y = Math.min(closed, Math.max(0, base + dy))
        node.style.transform = `translateY(${y}px)`
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        setDragging(false)
        const current = stageRef.current
        if (Math.abs(offset) < TAP_PX) {
          applyStage(current)
          return
        }
        const flickUp = offset < -16 && velocity < -FLICK_PX_MS
        const flickDown = offset > 16 && velocity > FLICK_PX_MS
        if (offset < -SNAP_PX || flickUp) applyStage(stepStage(current, 'up'))
        else if (offset > SNAP_PX || flickDown) applyStage(stepStage(current, 'down'))
        else applyStage(current)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [applyStage, enabled],
  )

  return {
    sheetRef,
    dragging,
    bind: { onPointerDown },
  }
}

export function useSheetDrag(onClose: () => void, enabled: boolean) {
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const lastY = useRef(0)
  const lastT = useRef(0)
  const velocity = useRef(0)
  const offsetRef = useRef(0)
  const draggingRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const paint = useCallback((dy: number) => {
    const node = sheetRef.current
    if (!node) return
    const shown = dy < 0 ? dy * 0.35 : dy
    node.style.transition = 'none'
    node.style.transform = `translateY(${shown}px)`
  }, [])

  const clearPaint = useCallback((open: boolean) => {
    const node = sheetRef.current
    if (!node) return
    node.style.transition = 'transform 300ms'
    node.style.transform = open ? 'translateY(0px)' : closedTranslate()
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return
      event.preventDefault()
      event.stopPropagation()
      startY.current = event.clientY
      lastY.current = event.clientY
      lastT.current = event.timeStamp
      velocity.current = 0
      offsetRef.current = 0
      draggingRef.current = true
      setDragging(true)
      paint(0)
      event.currentTarget.setPointerCapture(event.pointerId)

      const onMove = (moveEvent: PointerEvent) => {
        if (!draggingRef.current) return
        const dy = moveEvent.clientY - startY.current
        const dt = Math.max(1, moveEvent.timeStamp - lastT.current)
        velocity.current = (moveEvent.clientY - lastY.current) / dt
        lastY.current = moveEvent.clientY
        lastT.current = moveEvent.timeStamp
        offsetRef.current = dy
        paint(dy)
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        if (!draggingRef.current) return
        const dy = offsetRef.current
        const flicked = dy > 20 && velocity.current > FLICK_PX_MS
        const pulled = dy > CLOSE_PX
        const tapped = Math.abs(dy) < TAP_PX
        draggingRef.current = false
        setDragging(false)
        offsetRef.current = 0
        if (tapped || pulled || flicked) {
          clearPaint(false)
          onCloseRef.current()
        } else {
          clearPaint(true)
        }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [clearPaint, enabled, paint],
  )

  return {
    sheetRef,
    dragging,
    bind: { onPointerDown },
  }
}

export function useFieldTapDismiss(onDismiss: () => void) {
  const origin = useRef({ x: 0, y: 0, id: -1 })
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerId !== origin.current.id) return
      const dx = event.clientX - origin.current.x
      const dy = event.clientY - origin.current.y
      origin.current = { x: 0, y: 0, id: -1 }
      if (dx * dx + dy * dy <= TAP_PX * TAP_PX) onDismissRef.current()
    },
  }
}
