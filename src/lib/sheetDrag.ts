import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const TAP_PX = 10
const CLOSE_PX = 56
const FLICK_PX_MS = 0.32

type DragBind = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
}

export function useSheetDrag(onClose: () => void, enabled: boolean) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const lastY = useRef(0)
  const lastT = useRef(0)
  const velocity = useRef(0)
  const offsetRef = useRef(0)
  const draggingRef = useRef(false)

  const finish = useCallback(() => {
    if (!draggingRef.current) return
    const dy = offsetRef.current
    const flicked = dy > 20 && velocity.current > FLICK_PX_MS
    const pulled = dy > CLOSE_PX
    const tapped = Math.abs(dy) < TAP_PX
    draggingRef.current = false
    setDragging(false)
    setOffset(0)
    offsetRef.current = 0
    if (tapped || pulled || flicked) onClose()
  }, [onClose])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return
      event.preventDefault()
      startY.current = event.clientY
      lastY.current = event.clientY
      lastT.current = event.timeStamp
      velocity.current = 0
      offsetRef.current = 0
      draggingRef.current = true
      setDragging(true)
      setOffset(0)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [enabled],
  )

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return
    const dy = event.clientY - startY.current
    const dt = Math.max(1, event.timeStamp - lastT.current)
    velocity.current = (event.clientY - lastY.current) / dt
    lastY.current = event.clientY
    lastT.current = event.timeStamp
    const next = Math.max(-28, dy)
    offsetRef.current = next
    setOffset(next)
  }, [])

  const bind: DragBind = {
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
  }

  return { offset, dragging, bind }
}

export function useFieldTapDismiss(onDismiss: () => void) {
  const origin = useRef({ x: 0, y: 0, id: -1 })

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerId !== origin.current.id) return
      const dx = event.clientX - origin.current.x
      const dy = event.clientY - origin.current.y
      origin.current = { x: 0, y: 0, id: -1 }
      if (dx * dx + dy * dy <= TAP_PX * TAP_PX) onDismiss()
    },
  }
}
