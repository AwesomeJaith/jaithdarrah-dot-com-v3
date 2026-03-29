import { useCallback, useEffect, useRef, useState } from "react"

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
  stickerBlob: Blob | null
  setStickerBlob: (blob: Blob | null) => void
  setBlurDataUrl: (url: string | null) => void
}

export function useStickerPlacement({
  stickerPreviewUrl,
  setStickerPreviewUrl,
  stickerBlob,
  setStickerBlob,
  setBlurDataUrl,
}: UseStickerPlacementParams) {
  const [isPlacing, setIsPlacing] = useState(false)
  const [placementPos, setPlacementPos] = useState<{
    x: number
    y: number
  } | null>(null)
  const [placementRotation, setPlacementRotation] = useState(0)
  const [showCreator, setShowCreator] = useState(false)

  const edgePanRafRef = useRef<number | null>(null)
  const lastPointerScreenRef = useRef<{ x: number; y: number } | null>(null)

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
    if (!(isPlacing && stickerPreviewUrl)) {
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
  }, [isPlacing, stickerPreviewUrl])

  // Callbacks for the pan/zoom hook
  const onPointerMove = useCallback(
    (screenX: number, screenY: number) => {
      lastPointerScreenRef.current = { x: screenX, y: screenY }
      const world = panZoomRef.current.screenToWorld(screenX, screenY)
      setPlacementPos({ x: world.x - 50, y: world.y - 50 })
    },
    []
  )

  const onPointerConfirm = useCallback(
    (screenX: number, screenY: number) => {
      const world = panZoomRef.current.screenToWorld(screenX, screenY)
      setPlacementPos({ x: world.x - 50, y: world.y - 50 })
      setShowCreator(true)
    },
    []
  )

  const onWheel = useCallback((deltaY: number) => {
    const delta = deltaY > 0 ? 5 : -5
    setPlacementRotation((prev) => prev + delta)
  }, [])

  const cancelPlacement = useCallback(() => {
    setIsPlacing(false)
    setPlacementPos(null)
    setPlacementRotation(0)
    setStickerBlob(null)
    lastPointerScreenRef.current = null
    if (stickerPreviewUrl) {
      URL.revokeObjectURL(stickerPreviewUrl)
      setStickerPreviewUrl(null)
    }
  }, [stickerPreviewUrl, setStickerBlob, setStickerPreviewUrl])

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
  }, [setStickerBlob, setStickerPreviewUrl, setBlurDataUrl])

  const handleStickerSubmitted = useCallback(
    () => {
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
    },
    [stickerPreviewUrl, setStickerBlob, setStickerPreviewUrl, setBlurDataUrl]
  )

  const handleCreatorClose = useCallback(() => {
    setShowCreator(false)
    if (!stickerBlob) {
      setIsPlacing(false)
    }
  }, [stickerBlob])

  return {
    isPlacing,
    placementPos,
    placementRotation,
    showCreator,
    cancelPlacement,
    handleStickerProcessed,
    handleStickerSubmitted,
    handleCreatorClose,
    onPointerMove,
    onPointerConfirm,
    onWheel,
    setPanZoom,
  }
}
