import { useCallback, useEffect, useRef, useState } from "react"
import type { Sticker } from "@/lib/stickers"
import { computeOverlapRatio, MAX_OVERLAP_RATIO } from "@/lib/overlap"
import type { StickerData } from "./use-upload-card"

const EDGE_PAN_MARGIN = 50
const EDGE_PAN_MAX_SPEED = 5

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
  stickers: Map<string, Sticker>
): boolean {
  for (const s of stickers.values()) {
    if (s.status === "rejected") continue
    if (
      computeOverlapRatio(x, y, width, height, s.x, s.y, s.width, s.height) >
      MAX_OVERLAP_RATIO
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
  const [pendingConfirm, setPendingConfirm] = useState(false)
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
    overlapTimerRef.current = setTimeout(() => setOverlapError(false), 3000)
  }, [])

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
    stickerDataRef.current = null
    blurDataUrlRef.current = null
    lastPointerScreenRef.current = null
    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl)
      setStickerPreviewUrl(null)
    }
  }, [stickerPreviewUrl, setStickerPreviewUrl])

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
          setPlacementPos({
            x: worldX - placementSize.width / 2,
            y: worldY - placementSize.height / 2,
          })
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
  }, [isPlacing, stickerPreviewUrl, pendingConfirm, placementSize])

  // Callbacks for the pan/zoom hook
  const onPointerMove = useCallback(
    (screenX: number, screenY: number) => {
      lastPointerScreenRef.current = { x: screenX, y: screenY }
      if (pendingConfirm) return
      if (overlapError) setOverlapError(false)
      const world = panZoomRef.current.screenToWorld(screenX, screenY)
      setPlacementPos({
        x: world.x - placementSize.width / 2,
        y: world.y - placementSize.height / 2,
      })
    },
    [pendingConfirm, overlapError, placementSize]
  )

  const onPointerConfirm = useCallback(
    (screenX: number, screenY: number) => {
      if (pendingConfirm || isSubmitting) return
      const world = panZoomRef.current.screenToWorld(screenX, screenY)
      setPlacementPos({
        x: world.x - placementSize.width / 2,
        y: world.y - placementSize.height / 2,
      })
      setPendingConfirm(true)
    },
    [pendingConfirm, isSubmitting, placementSize]
  )

  const cancelConfirm = useCallback(() => {
    setPendingConfirm(false)
  }, [])

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

  const onWheel = useCallback(
    (deltaY: number) => {
      if (pendingConfirm) return
      const delta = deltaY > 0 ? 5 : -5
      setPlacementRotation((prev) => prev + delta)
    },
    [pendingConfirm]
  )

  const cancelPlacement = useCallback(() => {
    resetAll()
  }, [resetAll])

  const handleStickerProcessed = useCallback(
    async (data: StickerData) => {
      const url = URL.createObjectURL(data.blob)
      setStickerPreviewUrl(url)
      stickerDataRef.current = data
      setPlacementSize(computeStickerSize(data.imageWidth, data.imageHeight))
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
    onPointerMove,
    onPointerConfirm,
    onWheel,
    setPanZoom,
  }
}
