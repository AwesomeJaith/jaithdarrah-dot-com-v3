import { useCallback, useEffect, useRef, useState } from "react"
import type { Sticker } from "@/lib/stickers"
import { computeAlphaOverlapRatio, MAX_OVERLAP_RATIO } from "@/lib/overlap"
import type { StickerData } from "./use-upload-card"

const EDGE_PAN_MARGIN = 50
const EDGE_PAN_SLOW_SPEED = 2
const EDGE_PAN_ACCEL = 0.05
const EDGE_PAN_MAX_SPEED = 25

function edgePanAxis(rel: number, size: number): number {
  const distFromNear = rel
  const distFromFar = size - rel

  if (distFromNear >= EDGE_PAN_MARGIN && distFromFar >= EDGE_PAN_MARGIN)
    return 0

  // Closer edge wins
  if (distFromNear < distFromFar) {
    if (distFromNear >= 0) {
      // Inside canvas, within margin — slow linear ramp
      return EDGE_PAN_SLOW_SPEED * (1 - distFromNear / EDGE_PAN_MARGIN)
    }
    // Past the edge — accelerate based on how far out
    return Math.min(
      EDGE_PAN_MAX_SPEED,
      EDGE_PAN_SLOW_SPEED + -distFromNear * EDGE_PAN_ACCEL
    )
  } else {
    if (distFromFar >= 0) {
      return -(EDGE_PAN_SLOW_SPEED * (1 - distFromFar / EDGE_PAN_MARGIN))
    }
    return -Math.min(
      EDGE_PAN_MAX_SPEED,
      EDGE_PAN_SLOW_SPEED + -distFromFar * EDGE_PAN_ACCEL
    )
  }
}

function computeEdgePanDelta(
  screenX: number,
  screenY: number,
  rect: DOMRect
): { dx: number; dy: number } {
  return {
    dx: edgePanAxis(screenX - rect.left, rect.width),
    dy: edgePanAxis(screenY - rect.top, rect.height),
  }
}

type PanZoomOutputs = {
  setTranslate: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  scale: number
  containerRef: React.RefObject<HTMLDivElement>
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number }
}

type UseStickerPlacementParams = {
  stickerPreviewUrl: string | null
  setStickerPreviewUrl: (url: string | null) => void
  onStickerSubmitted: (sticker: Sticker) => void
  stickersRef: React.RefObject<Map<string, Sticker>>
}

const STICKER_MAX_SIDE = 100

/** Scale trimmed image dimensions so the longest side fits STICKER_MAX_SIDE. */
export function computeStickerSize(
  imageWidth: number,
  imageHeight: number
): { width: number; height: number } {
  const scale = STICKER_MAX_SIDE / Math.max(imageWidth, imageHeight)
  return {
    width: Math.round(imageWidth * scale),
    height: Math.round(imageHeight * scale),
  }
}

function hasClientOverlap(
  x: number,
  y: number,
  width: number,
  height: number,
  alphaMask: string | null,
  stickers: Map<string, Sticker>
): boolean {
  for (const s of stickers.values()) {
    if (s.status === "rejected") continue
    if (
      computeAlphaOverlapRatio(
        x,
        y,
        width,
        height,
        alphaMask,
        s.x,
        s.y,
        s.width,
        s.height,
        s.alpha_mask
      ) > MAX_OVERLAP_RATIO
    )
      return true
  }
  return false
}

async function generateBlurDataUrl(blob: Blob): Promise<string> {
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
  return `data:image/png;base64,${base64}`
}

export function useStickerPlacement({
  stickerPreviewUrl,
  setStickerPreviewUrl,
  onStickerSubmitted,
  stickersRef,
}: UseStickerPlacementParams) {
  const [isPlacing, setIsPlacing] = useState(false)
  const [pendingConfirm, _setPendingConfirm] = useState(false)
  const pendingConfirmRef = useRef(false)
  const setPendingConfirm = useCallback((v: boolean) => {
    pendingConfirmRef.current = v
    _setPendingConfirm(v)
  }, [])
  const [placementPos, setPlacementPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const [placementRotation, setPlacementRotation] = useState(0)
  const [placementSize, setPlacementSize] = useState<{
    width: number
    height: number
  }>({ width: 100, height: 100 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overlapError, setOverlapError] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [placementAlphaMask, setPlacementAlphaMask] = useState<string | null>(
    null
  )
  const overlapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (overlapTimerRef.current) clearTimeout(overlapTimerRef.current)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const showOverlapError = useCallback(() => {
    setPendingConfirm(false)
    setOverlapError(true)
    if (overlapTimerRef.current) clearTimeout(overlapTimerRef.current)
    overlapTimerRef.current = setTimeout(() => setOverlapError(false), 2000)
  }, [setPendingConfirm])

  // Store sticker metadata for auto-submit
  const stickerDataRef = useRef<StickerData | null>(null)
  const blurDataUrlRef = useRef<string | null>(null)
  const edgePanRafRef = useRef<number | null>(null)
  const lastPointerScreenRef = useRef<{ x: number; y: number } | null>(null)

  const resetAll = useCallback(() => {
    setIsPlacing(false)
    setPendingConfirm(false)
    setPlacementPos(null)
    setPlacementRotation(0)
    setPlacementSize({ width: 100, height: 100 })
    setPlacementAlphaMask(null)
    stickerDataRef.current = null
    blurDataUrlRef.current = null
    lastPointerScreenRef.current = null
    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl)
      setStickerPreviewUrl(null)
    }
  }, [setPendingConfirm, stickerPreviewUrl, setStickerPreviewUrl])

  // Pan/zoom outputs arrive after the pan/zoom hook runs — store in ref
  const panZoomRef = useRef<PanZoomOutputs>({
    setTranslate: () => {},
    scale: 1,
    containerRef: { current: null! },
    screenToWorld: () => ({ x: 0, y: 0 }),
  })

  const setPanZoom = useCallback((pz: PanZoomOutputs) => {
    panZoomRef.current = pz
  }, [])

  // Track pointer globally during placement so edge-pan works outside canvas
  useEffect(() => {
    if (!(isPlacing && stickerPreviewUrl) || pendingConfirm) return
    const handler = (e: PointerEvent) => {
      lastPointerScreenRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("pointermove", handler)
    return () => window.removeEventListener("pointermove", handler)
  }, [isPlacing, stickerPreviewUrl, pendingConfirm])

  // Edge-pan: auto-scroll when cursor is near canvas edge during placement
  useEffect(() => {
    if (!(isPlacing && stickerPreviewUrl) || pendingConfirm) {
      if (edgePanRafRef.current !== null) {
        cancelAnimationFrame(edgePanRafRef.current)
        edgePanRafRef.current = null
      }
      return
    }

    const tick = () => {
      const { containerRef, setTranslate, scale } = panZoomRef.current
      const container = containerRef.current
      const pointer = lastPointerScreenRef.current
      if (!container || !pointer) {
        edgePanRafRef.current = requestAnimationFrame(tick)
        return
      }

      const rect = container.getBoundingClientRect()
      const { dx, dy } = computeEdgePanDelta(pointer.x, pointer.y, rect)
      const panning = dx !== 0 || dy !== 0

      // Single source of truth for sticker position — avoids fighting
      // between pointer events and edge-pan by always computing here.
      setTranslate((prev) => {
        const next = panning ? { x: prev.x + dx, y: prev.y + dy } : prev
        const worldX = (pointer.x - rect.left - next.x) / scale
        const worldY = (pointer.y - rect.top - next.y) / scale
        setPlacementPos((prevPos) => {
          const newX = worldX - placementSize.width / 2
          const newY = worldY - placementSize.height / 2
          if (prevPos && prevPos.x === newX && prevPos.y === newY)
            return prevPos
          return { x: newX, y: newY }
        })
        return next
      })

      edgePanRafRef.current = requestAnimationFrame(tick)
    }

    edgePanRafRef.current = requestAnimationFrame(tick)

    return () => {
      if (edgePanRafRef.current !== null) {
        cancelAnimationFrame(edgePanRafRef.current)
        edgePanRafRef.current = null
      }
    }
  }, [isPlacing, stickerPreviewUrl, pendingConfirm, placementSize])

  // Callbacks for the pan/zoom hook
  const onPointerMove = useCallback((screenX: number, screenY: number) => {
    lastPointerScreenRef.current = { x: screenX, y: screenY }
    if (pendingConfirmRef.current) return
    // Position is computed by the rAF tick loop (single source of truth)
  }, [])

  // On touch, tapping the canvas while confirm is showing picks the sticker back up
  const onPointerDown = useCallback(
    (isTouch: boolean) => {
      if (isTouch && pendingConfirmRef.current && !isSubmitting) {
        setPendingConfirm(false)
        setOverlapError(false)
      }
    },
    [isSubmitting, setPendingConfirm]
  )

  const onPointerConfirm = useCallback(
    (screenX: number, screenY: number) => {
      if (pendingConfirmRef.current || isSubmitting) return
      const world = panZoomRef.current.screenToWorld(screenX, screenY)
      setPlacementPos({
        x: world.x - placementSize.width / 2,
        y: world.y - placementSize.height / 2,
      })
      setPendingConfirm(true)
    },
    [isSubmitting, placementSize, setPendingConfirm]
  )

  const cancelConfirm = useCallback(() => {
    setPendingConfirm(false)
  }, [setPendingConfirm])

  const confirmPlacement = useCallback(async () => {
    const data = stickerDataRef.current
    const pos = placementPos
    if (!data || !pos || isSubmitting) return

    // Client-side overlap check before hitting the API
    const currentStickers = stickersRef.current
    if (
      currentStickers &&
      hasClientOverlap(
        pos.x,
        pos.y,
        placementSize.width,
        placementSize.height,
        data.alphaMask,
        currentStickers
      )
    ) {
      showOverlapError()
      return
    }

    setIsSubmitting(true)

    try {
      const blur =
        blurDataUrlRef.current ?? (await generateBlurDataUrl(data.blob))

      const formData = new FormData()
      formData.append("image", data.blob, "sticker.avif")
      formData.append("blur_data_url", blur)
      formData.append("username", data.username)
      if (data.message) formData.append("message", data.message)
      if (data.effect) formData.append("effect", data.effect)
      formData.append("x", String(pos.x))
      formData.append("y", String(pos.y))
      formData.append("width", String(placementSize.width))
      formData.append("height", String(placementSize.height))
      formData.append("rotation", String(placementRotation))
      formData.append("alpha_mask", data.alphaMask)

      const res = await fetch("/api/stickers", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        if (res.status === 409) showOverlapError()
        setIsSubmitting(false)
        return
      }

      const sticker: Sticker = await res.json()
      onStickerSubmitted(sticker)
      setIsSubmitting(false)
      setSubmitSuccess(true)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => {
        setSubmitSuccess(false)
        resetAll()
      }, 2000)
    } catch (err) {
      console.error("Sticker submission error:", err)
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    placementPos,
    placementSize,
    placementRotation,
    resetAll,
    stickersRef,
    showOverlapError,
    onStickerSubmitted,
  ])

  const onWheel = useCallback((deltaY: number) => {
    if (pendingConfirmRef.current) return
    const delta = deltaY > 0 ? 5 : -5
    setPlacementRotation((prev) => prev + delta)
  }, [])

  const cancelPlacement = useCallback(() => {
    resetAll()
  }, [resetAll])

  const handleStickerProcessed = useCallback(
    async (data: StickerData) => {
      const url = URL.createObjectURL(data.blob)
      setStickerPreviewUrl(url)
      stickerDataRef.current = data
      setPlacementSize(computeStickerSize(data.imageWidth, data.imageHeight))
      setPlacementAlphaMask(data.alphaMask)
      setIsPlacing(true)
      setPlacementRotation(0)

      // Generate blur placeholder in the background
      try {
        const blurUrl = await generateBlurDataUrl(data.blob)
        blurDataUrlRef.current = blurUrl
      } catch {
        // Blur generation is best-effort
      }
    },
    [setStickerPreviewUrl]
  )

  return {
    isPlacing,
    pendingConfirm,
    placementPos,
    placementSize,
    placementRotation,
    isSubmitting,
    overlapError,
    submitSuccess,
    cancelPlacement,
    cancelConfirm,
    confirmPlacement,
    handleStickerProcessed,
    onPointerDown,
    onPointerMove,
    onPointerConfirm,
    onWheel,
    setPanZoom,
    placementAlphaMask,
  }
}
