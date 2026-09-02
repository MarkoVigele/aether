import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const TAP_PX = 10
const CLOSE_PX = 56
const FLICK_PX_MS = 0.32

function closedTranslate() {
  return 'translateY(calc(100% + var(--dock-space) + 0.75rem))'
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
