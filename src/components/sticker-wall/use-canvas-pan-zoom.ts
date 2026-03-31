import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

const MIN_SCALE = 0.1
const MAX_SCALE = 3
const ZOOM_STEP = 0.15
const PAN_THRESHOLD = 5

type UseCanvasPanZoomParams = {
  isPlacing: boolean
  stickerPreviewUrl: string | null
  onPlacementPointerDown?: (isTouch: boolean) => void
  onPlacementPointerMove?: (screenX: number, screenY: number) => void
  onPlacementConfirm?: (screenX: number, screenY: number) => void
  onPlacementWheel?: (deltaY: number) => void
}

export function useCanvasPanZoom({
  isPlacing,
  stickerPreviewUrl,
  onPlacementPointerDown,
  onPlacementPointerMove,
  onPlacementConfirm,
  onPlacementWheel,
}: UseCanvasPanZoomParams) {
  const containerRef = useRef<HTMLDivElement>(null!)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [scale, _setScale] = useState(1)
  const scaleRef = useRef(1)
  const setScale = useCallback((s: number | ((prev: number) => number)) => {
    if (typeof s === "function") {
      _setScale((prev) => {
        const next = s(prev)
        scaleRef.current = next
        return next
      })
    } else {
      scaleRef.current = s
      _setScale(s)
    }
  }, [])

  const [containerSize, setContainerSize] = useState<{
    width: number
    height: number
  } | null>(null)

  // Pan state
  const isPanningRef = useRef(false)
  const panPendingRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const translateStartRef = useRef({ x: 0, y: 0 })

  // Pinch state
  const pinchRef = useRef<{
    dist: number
    scale: number
    midX: number
    midY: number
    translate: { x: number; y: number }
  } | null>(null)
  const pointersRef = useRef<Map<number, PointerEvent>>(new Map())

  // Stable refs for placement callbacks (avoids stale closures in handlers)
  const placementActiveRef = useRef(false)
  const placementPointerDownRef = useRef(onPlacementPointerDown)
  const placementPointerMoveRef = useRef(onPlacementPointerMove)
  const placementConfirmRef = useRef(onPlacementConfirm)
  const placementWheelRef = useRef(onPlacementWheel)

  useEffect(() => {
    placementActiveRef.current = isPlacing && !!stickerPreviewUrl
    placementPointerDownRef.current = onPlacementPointerDown
    placementPointerMoveRef.current = onPlacementPointerMove
    placementConfirmRef.current = onPlacementConfirm
    placementWheelRef.current = onPlacementWheel
  })

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const container = containerRef.current
      if (!container) return { x: 0, y: 0 }
      const rect = container.getBoundingClientRect()
      return {
        x: (screenX - rect.left - translate.x) / scale,
        y: (screenY - rect.top - translate.y) / scale,
      }
    },
    [translate, scale]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return

      // Clear stale pointers: if there's an existing entry but no active
      // pan or pinch, it's left over from a touch that didn't get pointerup
      if (
        pointersRef.current.size > 0 &&
        !isPanningRef.current &&
        !panPendingRef.current &&
        pinchRef.current === null
      ) {
        pointersRef.current.clear()
      }

      pointersRef.current.set(e.pointerId, e.nativeEvent)

      // If two pointers, start pinch
      if (pointersRef.current.size === 2) {
        const pointers = Array.from(pointersRef.current.values())
        const dist = Math.hypot(
          pointers[0].clientX - pointers[1].clientX,
          pointers[0].clientY - pointers[1].clientY
        )
        const container = containerRef.current
        const rect = container?.getBoundingClientRect()
        const midX =
          (pointers[0].clientX + pointers[1].clientX) / 2 - (rect?.left ?? 0)
        const midY =
          (pointers[0].clientY + pointers[1].clientY) / 2 - (rect?.top ?? 0)
        pinchRef.current = {
          dist,
          scale,
          midX,
          midY,
          translate: { ...translate },
        }
        isPanningRef.current = false
        return
      }

      if (isPlacing && stickerPreviewUrl) {
        const isTouch = e.pointerType === "touch"
        placementPointerDownRef.current?.(isTouch)
        return
      }

      panPendingRef.current = true
      isPanningRef.current = false
      panStartRef.current = { x: e.clientX, y: e.clientY }
      translateStartRef.current = { ...translate }
    },
    [translate, scale, isPlacing, stickerPreviewUrl]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      pointersRef.current.set(e.pointerId, e.nativeEvent)

      // Handle pinch zoom + pan
      if (pointersRef.current.size === 2 && pinchRef.current) {
        const pointers = Array.from(pointersRef.current.values())
        const dist = Math.hypot(
          pointers[0].clientX - pointers[1].clientX,
          pointers[0].clientY - pointers[1].clientY
        )
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(
            MIN_SCALE,
            pinchRef.current.scale * (dist / pinchRef.current.dist)
          )
        )

        const container = containerRef.current
        const rect = container?.getBoundingClientRect()
        const curMidX =
          (pointers[0].clientX + pointers[1].clientX) / 2 - (rect?.left ?? 0)
        const curMidY =
          (pointers[0].clientY + pointers[1].clientY) / 2 - (rect?.top ?? 0)

        const scaleChange = newScale / pinchRef.current.scale
        setTranslate({
          x:
            curMidX -
            (pinchRef.current.midX - pinchRef.current.translate.x) *
              scaleChange,
          y:
            curMidY -
            (pinchRef.current.midY - pinchRef.current.translate.y) *
              scaleChange,
        })
        setScale(newScale)
        return
      }

      // Update placement cursor position
      if (placementActiveRef.current) {
        placementPointerMoveRef.current?.(e.clientX, e.clientY)
      }

      // Handle pan
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y

      if (panPendingRef.current && !isPanningRef.current) {
        if (Math.abs(dx) + Math.abs(dy) < PAN_THRESHOLD) return
        isPanningRef.current = true
        panPendingRef.current = false
        containerRef.current?.setPointerCapture(e.pointerId)
      }

      if (!isPanningRef.current) return
      setTranslate({
        x: translateStartRef.current.x + dx,
        y: translateStartRef.current.y + dy,
      })
    },
    [setScale]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const wasPinching = pinchRef.current !== null

    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) {
      pinchRef.current = null
    }

    if (placementActiveRef.current && !isPanningRef.current && !wasPinching) {
      placementConfirmRef.current?.(e.clientX, e.clientY)
    }

    isPanningRef.current = false
    panPendingRef.current = false
  }, [])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (placementActiveRef.current) {
        placementWheelRef.current?.(e.deltaY)
        return
      }

      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      const currentScale = scaleRef.current
      const zoomFactor = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, currentScale * zoomFactor)
      )

      const scaleChange = newScale / currentScale
      setTranslate((prev) => ({
        x: cursorX - (cursorX - prev.x) * scaleChange,
        y: cursorY - (cursorY - prev.y) * scaleChange,
      }))
      setScale(newScale)
    },
    [setScale]
  )

  // Attach wheel handler as non-passive
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      handleWheel(e)
    }
    container.addEventListener("wheel", onWheel, { passive: false })
    return () => container.removeEventListener("wheel", onWheel)
  }, [handleWheel])

  // Synchronous initial measurement
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const { width, height } = container.getBoundingClientRect()
    setTranslate({ x: width / 2, y: height / 2 })
    setContainerSize({ width, height })
  }, [])

  // Keep origin centered on resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const prevSize = container.getBoundingClientRect()

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const dx = (width - prevSize.width) / 2
      const dy = (height - prevSize.height) / 2
      if (dx !== 0 || dy !== 0) {
        setTranslate((t) => ({ x: t.x + dx, y: t.y + dy }))
      }
      prevSize.width = width
      prevSize.height = height
      setContainerSize({ width, height })
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  const pointerHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onLostPointerCapture: (e: React.PointerEvent) => {
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) pinchRef.current = null
    },
  }

  return {
    containerRef,
    translate,
    setTranslate,
    scale,
    setScale,
    containerSize,
    screenToWorld,
    pointerHandlers,
  }
}

export { MIN_SCALE, MAX_SCALE, ZOOM_STEP }
