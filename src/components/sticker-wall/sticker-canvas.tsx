"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import type { Sticker as StickerType } from "@/lib/stickers"
import { Button } from "@/components/ui/button"
import { FaUpload } from "react-icons/fa6"
import { Sticker } from "./sticker"
import { StickerInspector } from "./sticker-inspector"
import { StickerToolbar } from "./sticker-toolbar"
import { StickerMinimap } from "./sticker-minimap"
import { NotchedBorder, NOTCHED_CLIP_ID } from "./notched-border"
import { processStickerImage } from "./process-sticker-image"

const StickerCreator = dynamic(
  () =>
    import("./sticker-creator").then((mod) => ({
      default: mod.StickerCreator,
    })),
  { ssr: false }
)

type StickerCanvasProps = {
  initialStickers: StickerType[]
}

// Increase to slow down morph animation (e.g. 5 = 5× slower)
const MORPH_SPEED = 1

const MINIMAP_COMPACT_SIZE = 100
const MINIMAP_DEFAULT_SIZE = 120
const TOOLBAR_MARGIN = 12
const TOOLBAR_GAP = 6 // gap-1.5
const COMPACT_BREAKPOINT = 530
const MOVE_MS = 200
const SIZE_MS = 120
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)"

const MIN_SCALE = 0.1
const MAX_SCALE = 3
const ZOOM_STEP = 0.15
const NOTCH_PAD = 6
const PAN_THRESHOLD = 5 // px of movement before a pointerdown becomes a pan
const EDGE_PAN_MARGIN = 50 // px from edge to trigger auto-pan
const EDGE_PAN_MAX_SPEED = 5 // px per frame at the very edge

const COMPACT_QUERY = `(max-width: ${COMPACT_BREAKPOINT}px)`
function subscribeCompact(cb: () => void) {
  const mql = window.matchMedia(COMPACT_QUERY)
  mql.addEventListener("change", cb)
  return () => mql.removeEventListener("change", cb)
}
function getCompactSnapshot() {
  return window.matchMedia(COMPACT_QUERY).matches
}
function getCompactServerSnapshot() {
  return false
}

function computeEdgePanDelta(
  screenX: number,
  screenY: number,
  rect: DOMRect,
  margin: number,
  maxSpeed: number
): { dx: number; dy: number } {
  let dx = 0,
    dy = 0
  const relX = screenX - rect.left
  const relY = screenY - rect.top

  if (relX < margin) dx = maxSpeed * (1 - relX / margin)
  else if (relX > rect.width - margin)
    dx = -maxSpeed * (1 - (rect.width - relX) / margin)

  if (relY < margin) dy = maxSpeed * (1 - relY / margin)
  else if (relY > rect.height - margin)
    dy = -maxSpeed * (1 - (rect.height - relY) / margin)

  return { dx, dy }
}

export function StickerCanvas({ initialStickers }: StickerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [stickerMap, setStickerMap] = useState<Map<string, StickerType>>(
    () => new Map(initialStickers.map((s) => [s.id, s]))
  )
  const stickers = useMemo(() => Array.from(stickerMap.values()), [stickerMap])
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

  // Pan state
  const isPanningRef = useRef(false)
  const panPendingRef = useRef(false) // pointer is down but hasn't moved past threshold
  const panStartRef = useRef({ x: 0, y: 0 })
  const translateStartRef = useRef({ x: 0, y: 0 })

  // Edge-pan state (refs to avoid stale closures in RAF)
  const edgePanRafRef = useRef<number | null>(null)
  const lastPointerScreenRef = useRef<{ x: number; y: number } | null>(null)

  // Placement mode state
  const [isPlacing, setIsPlacing] = useState(false)
  const [placementPos, setPlacementPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const [placementRotation, setPlacementRotation] = useState(0)
  const [showCreator, setShowCreator] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadProcessing, setUploadProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const [stickerBlob, setStickerBlob] = useState<Blob | null>(null)
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null)
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState<string | null>(
    null
  )
  const uploadFileInputRef = useRef<HTMLInputElement>(null)
  const notchRootRef = useRef<HTMLDivElement>(null)

  // Inspect mode
  const [inspectedSticker, setInspectedSticker] = useState<StickerType | null>(
    null
  )

  // Container size for minimap viewport calc
  const [containerSize, setContainerSize] = useState<{
    width: number
    height: number
  } | null>(null)

  // Notch bar measurement
  const notchBarRef = useRef<HTMLDivElement>(null)
  const [notchSize, setNotchSize] = useState<{
    width: number
    height: number
  } | null>(null)

  const zoomRowRef = useRef<HTMLDivElement>(null)
  const [zoomRowHeight, setZoomRowHeight] = useState(0)

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  )

  // Pinch state
  const pinchRef = useRef<{
    dist: number
    scale: number
    midX: number
    midY: number
    translate: { x: number; y: number }
  } | null>(null)
  const pointersRef = useRef<Map<number, PointerEvent>>(new Map())

  // Convert screen coordinates to world coordinates
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

  // Pan handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only pan with left mouse button or single touch
      if (e.button !== 0) return

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
        // In placement mode, click to confirm placement
        return
      }

      // Don't start panning yet — wait for movement past threshold
      // so taps on stickers still work
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

        // Keep the world point under the initial pinch center
        // aligned with the current pinch center (zoom + pan)
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
      if (isPlacing && stickerPreviewUrl) {
        lastPointerScreenRef.current = { x: e.clientX, y: e.clientY }
        const world = screenToWorld(e.clientX, e.clientY)
        setPlacementPos({ x: world.x - 50, y: world.y - 50 })
      }

      // Handle pan
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y

      // Promote pending → panning once past threshold
      if (panPendingRef.current && !isPanningRef.current) {
        if (Math.abs(dx) + Math.abs(dy) < PAN_THRESHOLD) return
        isPanningRef.current = true
        panPendingRef.current = false
        // Capture so pointerup fires on the container even if pointer leaves
        containerRef.current?.setPointerCapture(e.pointerId)
      }

      if (!isPanningRef.current) return
      setTranslate({
        x: translateStartRef.current.x + dx,
        y: translateStartRef.current.y + dy,
      })
    },
    [isPlacing, stickerPreviewUrl, screenToWorld, setScale]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const wasPinching = pinchRef.current !== null

      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size < 2) {
        pinchRef.current = null
      }

      // If in placement mode and we didn't pan or pinch, confirm placement
      if (
        isPlacing &&
        stickerPreviewUrl &&
        !isPanningRef.current &&
        !wasPinching
      ) {
        const world = screenToWorld(e.clientX, e.clientY)
        setPlacementPos({ x: world.x - 50, y: world.y - 50 })
        setShowCreator(true)
      }

      // Reset pan state
      isPanningRef.current = false
      panPendingRef.current = false
    },
    [isPlacing, stickerPreviewUrl, screenToWorld]
  )

  // Wheel handler: zoom when not placing, rotate when placing
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (isPlacing && stickerPreviewUrl) {
        // Rotate the sticker during placement
        const delta = e.deltaY > 0 ? 5 : -5
        setPlacementRotation((prev) => prev + delta)
        return
      }

      // Zoom toward cursor
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

      // Adjust translate so zoom centers on cursor position
      const scaleChange = newScale / currentScale
      setTranslate((prev) => ({
        x: cursorX - (cursorX - prev.x) * scaleChange,
        y: cursorY - (cursorY - prev.y) * scaleChange,
      }))
      setScale(newScale)
    },
    [isPlacing, stickerPreviewUrl, setScale]
  )

  // Attach wheel handler as non-passive so preventDefault works
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

  // Edge-pan: auto-scroll when cursor is near canvas edge during placement
  useEffect(() => {
    if (!(isPlacing && stickerPreviewUrl)) {
      if (edgePanRafRef.current !== null) {
        cancelAnimationFrame(edgePanRafRef.current)
        edgePanRafRef.current = null
      }
      return
    }

    const tick = () => {
      const container = containerRef.current
      const pointer = lastPointerScreenRef.current
      if (!container || !pointer) {
        edgePanRafRef.current = requestAnimationFrame(tick)
        return
      }

      const rect = container.getBoundingClientRect()
      const { dx, dy } = computeEdgePanDelta(
        pointer.x,
        pointer.y,
        rect,
        EDGE_PAN_MARGIN,
        EDGE_PAN_MAX_SPEED
      )

      if (dx !== 0 || dy !== 0) {
        setTranslate((prev) => {
          const next = { x: prev.x + dx, y: prev.y + dy }
          const worldX = (pointer.x - rect.left - next.x) / scale
          const worldY = (pointer.y - rect.top - next.y) / scale
          setPlacementPos({ x: worldX - 50, y: worldY - 50 })
          return next
        })
      }

      edgePanRafRef.current = requestAnimationFrame(tick)
    }

    edgePanRafRef.current = requestAnimationFrame(tick)

    return () => {
      if (edgePanRafRef.current !== null) {
        cancelAnimationFrame(edgePanRafRef.current)
        edgePanRafRef.current = null
      }
    }
  }, [isPlacing, stickerPreviewUrl, scale])

  // Synchronous initial measurement to prevent first-frame flash of translate={0,0}
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const { width, height } = container.getBoundingClientRect()
    setTranslate({ x: width / 2, y: height / 2 })
    setContainerSize({ width, height })
  }, [])

  // Keep origin centered when the container resizes after mount
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

  // Track notch bar size
  useEffect(() => {
    const bar = notchBarRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    setNotchSize({ width: rect.width, height: rect.height })

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setNotchSize({ width, height })
    })
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = zoomRowRef.current
    if (el) setZoomRowHeight(el.offsetHeight)
  }, [])

  // Detect prefers-reduced-motion changes
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  // Responsive minimap positioning — based on window width, not container
  const isCompact = useSyncExternalStore(
    subscribeCompact,
    getCompactSnapshot,
    getCompactServerSnapshot
  )
  const minimapSize = isCompact ? MINIMAP_COMPACT_SIZE : MINIMAP_DEFAULT_SIZE
  const toolbarTop =
    isCompact || !containerSize
      ? TOOLBAR_MARGIN
      : containerSize.height -
        minimapSize -
        TOOLBAR_GAP -
        zoomRowHeight -
        TOOLBAR_MARGIN

  // Only animate when crossing the breakpoint, not on regular resize.
  const prevIsCompactRef = useRef(isCompact)
  const toolbarWrapperRef = useRef<HTMLDivElement>(null)
  const minimapWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prevIsCompactRef.current === isCompact) return
    prevIsCompactRef.current = isCompact

    const tw = toolbarWrapperRef.current
    const mw = minimapWrapperRef.current
    if (!tw || !mw || prefersReducedMotion) return

    const sizeDelay = isCompact ? MOVE_MS : 0
    const moveDelay = isCompact ? 0 : SIZE_MS
    tw.style.transition = `top ${MOVE_MS}ms ${EASE} ${moveDelay}ms, width ${SIZE_MS}ms ${EASE} ${sizeDelay}ms`
    mw.style.transition = `width ${SIZE_MS}ms ${EASE} ${sizeDelay}ms, height ${SIZE_MS}ms ${EASE} ${sizeDelay}ms`

    const totalMs = MOVE_MS + SIZE_MS + 50
    const timer = setTimeout(() => {
      tw.style.transition = "none"
      mw.style.transition = "none"
    }, totalMs)
    return () => clearTimeout(timer)
  }, [isCompact, prefersReducedMotion])

  // Navigate to a world position (from minimap click)
  const handleMinimapNavigate = useCallback(
    (worldX: number, worldY: number) => {
      if (!containerSize) return
      setTranslate({
        x: containerSize.width / 2 - worldX * scale,
        y: containerSize.height / 2 - worldY * scale,
      })
    },
    [containerSize, scale]
  )

  // Compute viewport bounds in world coordinates
  const getViewportBounds = useCallback(() => {
    const container = containerRef.current
    if (!container) return null
    const rect = container.getBoundingClientRect()
    const margin = 200 // Buffer to pre-load nearby stickers
    const minX = (0 - translate.x) / scale - margin
    const minY = (0 - translate.y) / scale - margin
    const maxX = (rect.width - translate.x) / scale + margin
    const maxY = (rect.height - translate.y) / scale + margin
    return { minX, minY, maxX, maxY }
  }, [translate, scale])

  // Fetch stickers for the current viewport (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const bounds = getViewportBounds()
      if (!bounds) return
      try {
        const params = new URLSearchParams({
          minX: String(Math.round(bounds.minX)),
          minY: String(Math.round(bounds.minY)),
          maxX: String(Math.round(bounds.maxX)),
          maxY: String(Math.round(bounds.maxY)),
        })
        const res = await fetch(`/api/stickers?${params}`)
        if (res.ok) {
          const data: StickerType[] = await res.json()
          setStickerMap((prev) => {
            const next = new Map(prev)
            for (const s of data) {
              next.set(s.id, s)
            }
            return next
          })
        }
      } catch {
        // Silently fail
      }
    }, 300) // 300ms debounce
    return () => clearTimeout(timer)
  }, [getViewportBounds])

  const handlePlaceStickerClick = useCallback(() => {
    if (isPlacing) {
      // Cancel placement
      setIsPlacing(false)
      setPlacementPos(null)
      setPlacementRotation(0)
      setStickerBlob(null)
      lastPointerScreenRef.current = null
      if (stickerPreviewUrl) {
        URL.revokeObjectURL(stickerPreviewUrl)
        setStickerPreviewUrl(null)
      }
    } else {
      // Open inline upload morph
      setShowUpload(true)
      setUploadError(null)
    }
  }, [isPlacing, stickerPreviewUrl])

  const handleUploadClose = useCallback(() => {
    if (uploadProcessing) return
    setShowUpload(false)
    setUploadError(null)
    setUploadDragOver(false)
  }, [uploadProcessing])

  // Close upload card on click outside
  useEffect(() => {
    if (!showUpload) return
    const handler = (e: MouseEvent) => {
      if (
        notchRootRef.current &&
        !notchRootRef.current.contains(e.target as Node)
      ) {
        handleUploadClose()
      }
    }
    document.addEventListener("pointerdown", handler)
    return () => document.removeEventListener("pointerdown", handler)
  }, [showUpload, handleUploadClose])

  const handleStickerProcessed = useCallback(async (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    setStickerBlob(blob)
    setStickerPreviewUrl(url)
    setShowCreator(false)
    setIsPlacing(true)
    setPlacementRotation(0)

    // Generate blur placeholder in the background
    try {
      const bitmap = await createImageBitmap(blob)
      const canvas = new OffscreenCanvas(16, 16)
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(bitmap, 0, 0, 16, 16)
      bitmap.close()
      const tinyBlob = await canvas.convertToBlob({ type: "image/png" })
      const buffer = await tinyBlob.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), "")
      )
      setBlurDataUrl(`data:image/png;base64,${base64}`)
    } catch {
      // Blur generation is best-effort
    }
  }, [])

  const handleUploadFile = useCallback(
    async (file: File) => {
      setUploadProcessing(true)
      setUploadError(null)
      try {
        const avifBlob = await processStickerImage(file)
        handleStickerProcessed(avifBlob)
        setShowUpload(false)
        setUploadError(null)
      } catch (err) {
        setUploadError(
          err instanceof Error
            ? err.message
            : "Failed to process image. Please try another one."
        )
      } finally {
        setUploadProcessing(false)
      }
    },
    [handleStickerProcessed]
  )

  const handleStickerSubmitted = useCallback(
    (newSticker: StickerType) => {
      // Don't add to canvas yet — it's pending approval
      // Just clean up placement state
      setShowCreator(false)
      setIsPlacing(false)
      setPlacementPos(null)
      setPlacementRotation(0)
      setStickerBlob(null)
      setBlurDataUrl(null)
      lastPointerScreenRef.current = null
      if (stickerPreviewUrl) {
        URL.revokeObjectURL(stickerPreviewUrl)
        setStickerPreviewUrl(null)
      }
      void newSticker // Sticker is pending, will appear after approval
    },
    [stickerPreviewUrl]
  )

  const handleCreatorClose = useCallback(() => {
    setShowCreator(false)
    if (!stickerBlob) {
      setIsPlacing(false)
    }
  }, [stickerBlob])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-sticker-canvas">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing"
        style={{
          ...(isPlacing && stickerPreviewUrl && { cursor: "crosshair" }),
          ...(containerSize &&
            notchSize && {
              clipPath: `url(#${NOTCHED_CLIP_ID})`,
            }),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={(e) => {
          pointersRef.current.delete(e.pointerId)
          if (pointersRef.current.size < 2) pinchRef.current = null
        }}
      >
        <div
          className="origin-top-left will-change-transform"
          style={{
            transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
          }}
        >
          {/* Origin crosshair */}
          <div className="absolute -top-4 -left-px h-8 w-0.5 bg-border" />
          <div className="absolute -top-px -left-4 h-0.5 w-8 bg-border" />

          {/* Placed stickers */}
          {stickers.map((sticker) => (
            <Sticker
              key={sticker.id}
              sticker={sticker}
              onInspect={setInspectedSticker}
              disabled={isPlacing && !!stickerPreviewUrl}
            />
          ))}

          {/* Placement preview */}
          {isPlacing && stickerPreviewUrl && placementPos && (
            <div
              className="pointer-events-none absolute opacity-70"
              style={{
                left: placementPos.x,
                top: placementPos.y,
                width: 100,
                height: 100,
                transform: `rotate(${placementRotation}deg)`,
              }}
            >
              <Image
                src={stickerPreviewUrl}
                alt="Sticker preview"
                className="h-full w-full object-contain"
                draggable={false}
                height={100}
                width={100}
                unoptimized
              />
            </div>
          )}
        </div>
      </div>

      {/* Toolbar (minimap + zoom controls) */}
      <div
        ref={toolbarWrapperRef}
        className="absolute z-40"
        style={{ top: toolbarTop, right: TOOLBAR_MARGIN, width: minimapSize }}
      >
        <StickerToolbar
          zoomRowRef={zoomRowRef}
          onZoomIn={() =>
            setScale((s) => Math.min(MAX_SCALE, s * (1 + ZOOM_STEP)))
          }
          onZoomOut={() =>
            setScale((s) => Math.max(MIN_SCALE, s * (1 - ZOOM_STEP)))
          }
          onResetView={() => {
            if (containerSize) {
              setTranslate({
                x: containerSize.width / 2,
                y: containerSize.height / 2,
              })
            } else {
              setTranslate({ x: 0, y: 0 })
            }
            setScale(1)
            // Reset sticker map to initial set so minimap world bounds contract
            setStickerMap(new Map(initialStickers.map((s) => [s.id, s])))
          }}
          minimap={
            <div
              ref={minimapWrapperRef}
              className="rounded-lg border border-border"
              style={{ width: minimapSize, height: minimapSize }}
            >
              <StickerMinimap
                stickers={stickers}
                translate={translate}
                scale={scale}
                containerSize={containerSize}
                onNavigate={handleMinimapNavigate}
                size={minimapSize}
              />
            </div>
          }
        />
      </div>

      {/* Border with notch cutout — notchPad guarantees px of space between buttons and stroke */}
      {containerSize && notchSize && (
        <NotchedBorder
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          notchWidth={notchSize.width + NOTCH_PAD * 2}
          notchHeight={notchSize.height + NOTCH_PAD}
          cornerRadius={14}
          notchRadius={14}
        />
      )}

      {/* Notch controls — morphing upload card */}
      <div
        ref={notchBarRef}
        className="absolute bottom-0 left-1/2 z-40 -translate-x-1/2"
      >
        <motion.div
          ref={notchRootRef}
          className="relative overflow-hidden"
          initial={false}
          animate={{
            width: showUpload ? 320 : "auto",
            height: showUpload ? 220 : "auto",
            borderRadius: showUpload ? 14 : 8,
            backgroundColor: showUpload
              ? "var(--color-popover)"
              : "transparent",
            boxShadow: showUpload
              ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
              : "none",
          }}
          transition={{
            type: "spring",
            stiffness: 550 / MORPH_SPEED,
            damping: 45,
            mass: 0.7,
          }}
        >
          {/* Upload card content — full size, anchored to bottom so it reveals from bottom up */}
          <div
            className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col gap-3 p-4"
            style={{
              width: 320,
              height: 220,
              pointerEvents: showUpload ? "all" : "none",
              visibility: showUpload ? "visible" : "hidden",
            }}
          >
            <AnimatePresence>
              {showUpload && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.15 * MORPH_SPEED,
                    delay: showUpload ? 0.1 * MORPH_SPEED : 0,
                  }}
                  className="flex h-full flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium">Create your sticker</h2>
                    <button
                      onClick={handleUploadClose}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Close"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div
                    className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
                      uploadDragOver
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => uploadFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setUploadDragOver(true)
                    }}
                    onDragLeave={() => setUploadDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setUploadDragOver(false)
                      const file = e.dataTransfer.files[0]
                      if (file) handleUploadFile(file)
                    }}
                  >
                    {uploadProcessing ? (
                      <p className="text-sm text-muted-foreground">
                        Processing...
                      </p>
                    ) : (
                      <>
                        <FaUpload className="size-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Drag & drop or click
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPEG, or WebP
                        </p>
                      </>
                    )}
                  </div>

                  <input
                    ref={uploadFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadFile(file)
                    }}
                    className="hidden"
                  />

                  {uploadError && (
                    <p className="text-xs text-destructive">{uploadError}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Invisible spacer — in flow to give the container its collapsed height */}
          <div className="invisible flex items-center gap-1">
            <Button size="lg" tabIndex={-1} aria-hidden>
              {isPlacing ? "Cancel" : "Create a sticker"}
            </Button>
            {!isPlacing && (
              <Button size="icon-lg" tabIndex={-1} aria-hidden>
                ?
              </Button>
            )}
          </div>

          {/* Button row — pinned to bottom center, fades out/in */}
          <motion.div
            className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1"
            animate={{ opacity: showUpload ? 0 : 1 }}
            transition={{
              duration: 0.1 * MORPH_SPEED,
              delay: showUpload ? 0 : 0.15 * MORPH_SPEED,
            }}
          >
            <Button
              variant={isPlacing ? "outline" : "default"}
              size="lg"
              onClick={handlePlaceStickerClick}
              style={{ pointerEvents: showUpload ? "none" : "auto" }}
            >
              {isPlacing ? "Cancel" : "Create a sticker"}
            </Button>
            {!isPlacing && (
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => {}}
                style={{ pointerEvents: showUpload ? "none" : "auto" }}
              >
                ?
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Placement hint */}
      {isPlacing && stickerPreviewUrl && (
        <div className="absolute top-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-sticker-border bg-sticker-panel px-4 py-2 text-sm text-popover-foreground shadow-md">
          Click to place your sticker. Scroll to rotate.
        </div>
      )}

      {/* Empty state */}
      {stickers.length === 0 && !isPlacing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No stickers yet!</p>
            <p className="mt-1 text-sm">Be the first to place one.</p>
          </div>
        </div>
      )}

      {/* Sticker inspector */}
      {inspectedSticker && (
        <StickerInspector
          sticker={inspectedSticker}
          onClose={() => setInspectedSticker(null)}
        />
      )}

      {/* Creator modal */}
      {showCreator && (
        <StickerCreator
          onClose={handleCreatorClose}
          onStickerProcessed={handleStickerProcessed}
          onStickerSubmitted={handleStickerSubmitted}
          stickerBlob={stickerBlob}
          blurDataUrl={blurDataUrl}
          placementPos={placementPos}
          placementRotation={placementRotation}
        />
      )}
    </div>
  )
}
