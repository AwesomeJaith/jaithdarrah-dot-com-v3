"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { motion } from "motion/react"
import Image from "next/image"
import type { Sticker as StickerType } from "@/lib/stickers"
import { Sticker } from "./sticker"
import { StickerInspector } from "./sticker-inspector"
import { StickerToolbar } from "./sticker-toolbar"
import { StickerMinimap } from "./sticker-minimap"
import { NotchFrame } from "@/components/ui/notch-frame"
import { useCanvasPanZoom, MIN_SCALE, MAX_SCALE, ZOOM_STEP } from "./use-canvas-pan-zoom"
import { useStickerPlacement } from "./use-sticker-placement"
import { useUploadCard } from "./use-upload-card"
import { UploadCard, CARD_WIDTH } from "./upload-card"

type StickerCanvasProps = {
  initialStickers: StickerType[]
}

const MINIMAP_COMPACT_SIZE = 100
const MINIMAP_DEFAULT_SIZE = 120
const TOOLBAR_MARGIN = 12
const TOOLBAR_GAP = 6
export const NOTCH_PAD = 6
// Move minimap to top when the toolbar would overlap the expanded upload card.
// The card is centered, so its right edge is at W/2 + notchWidth/2. The minimap
// needs TOOLBAR_MARGIN clearance from the notch and from the container edge.
const COMPACT_BREAKPOINT =
  CARD_WIDTH + NOTCH_PAD * 2 + (MINIMAP_DEFAULT_SIZE + TOOLBAR_MARGIN * 2) * 2


export function StickerCanvas({ initialStickers }: StickerCanvasProps) {
  const [stickerMap, setStickerMap] = useState<Map<string, StickerType>>(
    () => new Map(initialStickers.map((s) => [s.id, s]))
  )
  const stickers = useMemo(() => Array.from(stickerMap.values()), [stickerMap])

  // Shared state between placement and upload
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState<string | null>(null)

  // Inspect mode
  const [inspectedSticker, setInspectedSticker] = useState<StickerType | null>(null)

  // Layout measurement
  const notchBarRef = useRef<HTMLDivElement>(null!)
  const zoomRowRef = useRef<HTMLDivElement>(null!)
  const [zoomRowHeight, setZoomRowHeight] = useState(0)

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  )

  // Handle newly submitted sticker
  const handleStickerSubmitted = useCallback((sticker: StickerType) => {
    setStickerMap((prev) => {
      const next = new Map(prev)
      next.set(sticker.id, sticker)
      return next
    })
  }, [])

  // --- Placement hook (called first — pan/zoom receives its outputs) ---
  const placement = useStickerPlacement({
    stickerPreviewUrl,
    setStickerPreviewUrl,
    onStickerSubmitted: handleStickerSubmitted,
  })

  // --- Pan/zoom hook (receives placement state + callbacks directly) ---
  const {
    containerRef,
    translate,
    setTranslate,
    scale,
    setScale,
    containerSize,
    screenToWorld,
    pointerHandlers,
  } = useCanvasPanZoom({
    isPlacing: placement.isPlacing,
    stickerPreviewUrl,
    onPlacementPointerMove: placement.onPointerMove,
    onPlacementConfirm: placement.onPointerConfirm,
    onPlacementWheel: placement.onWheel,
  })

  // Wire pan/zoom outputs into placement hook via effects
  useEffect(() => {
    placement.setPanZoom({ setTranslate, scale, containerRef, screenToWorld })
  })

  const upload = useUploadCard({
    onStickerProcessed: placement.handleStickerProcessed,
  })

  // Handle the "create a sticker" / "cancel" button
  const handlePlaceStickerClick = useCallback(() => {
    if (placement.isPlacing) {
      placement.cancelPlacement()
    } else {
      upload.openUploadCard()
      upload.clearError()
    }
  }, [placement, upload])

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

  // Responsive minimap positioning — based on actual canvas width, not viewport
  const isCompact = !containerSize || containerSize.width < COMPACT_BREAKPOINT
  const minimapSize = isCompact ? MINIMAP_COMPACT_SIZE : MINIMAP_DEFAULT_SIZE
  const toolbarTop =
    isCompact || !containerSize
      ? TOOLBAR_MARGIN
      : containerSize.height -
        minimapSize -
        TOOLBAR_GAP -
        zoomRowHeight -
        TOOLBAR_MARGIN

  const toolbarSpring = {
    type: "spring" as const,
    stiffness: 400,
    damping: 35,
    mass: 0.8,
  }
  const toolbarTransition = prefersReducedMotion
    ? { duration: 0 }
    : toolbarSpring

  // Navigate to a world position (from minimap click)
  const handleMinimapNavigate = useCallback(
    (worldX: number, worldY: number) => {
      if (!containerSize) return
      setTranslate({
        x: containerSize.width / 2 - worldX * scale,
        y: containerSize.height / 2 - worldY * scale,
      })
    },
    [containerSize, scale, setTranslate]
  )

  // Compute viewport bounds in world coordinates
  const getViewportBounds = useCallback(() => {
    const container = containerRef.current
    if (!container) return null
    const rect = container.getBoundingClientRect()
    const margin = 200
    const minX = (0 - translate.x) / scale - margin
    const minY = (0 - translate.y) / scale - margin
    const maxX = (rect.width - translate.x) / scale + margin
    const maxY = (rect.height - translate.y) / scale + margin
    return { minX, minY, maxX, maxY }
  }, [translate, scale, containerRef])

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
    }, 300)
    return () => clearTimeout(timer)
  }, [getViewportBounds])

  return (
    <NotchFrame
      className="bg-sticker-canvas"
      notchPad={NOTCH_PAD}
      cornerRadius={14}
      notchRadius={14}
      notchContent={
        <UploadCard
          isPlacing={placement.isPlacing}
          isCompact={isCompact}
          notchPad={NOTCH_PAD}
          showUpload={upload.showUpload}
          showHelp={upload.showHelp}
          showPlace={upload.showPlace}
          showMessage={upload.showMessage}
          uploadProcessing={upload.uploadProcessing}
          targetProgress={upload.targetProgress}
          stageText={upload.stageText}
          processingDone={upload.processingDone}
          uploadError={upload.uploadError}
          uploadDragOver={upload.uploadDragOver}
          setUploadDragOver={upload.setUploadDragOver}
          uploadFileInputRef={upload.uploadFileInputRef}
          notchRootRef={upload.notchRootRef}
          notchBarRef={notchBarRef}
          handleCardClose={upload.handleCardClose}
          handleUploadFile={upload.handleUploadFile}
          handlePlaceStickerClick={handlePlaceStickerClick}
          transitionToPlace={upload.transitionToPlace}
          transitionToMessage={upload.transitionToMessage}
          stickerPreviewUrl={upload.stickerPreviewUrl}
          handlePlaceConfirm={upload.handlePlaceConfirm}
          handleHelpOpen={upload.openHelpCard}
          username={upload.username}
          setUsername={upload.setUsername}
          message={upload.message}
          setMessage={upload.setMessage}
        />
      }
      overlays={
        <>
          {/* Toolbar (minimap + zoom controls) */}
          <motion.div
            className="absolute z-40"
            initial={false}
            animate={{
              top: toolbarTop,
              width: minimapSize,
            }}
            transition={toolbarTransition}
            style={{ right: TOOLBAR_MARGIN }}
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
                setStickerMap(new Map(initialStickers.map((s) => [s.id, s])))
              }}
              minimap={
                <motion.div
                  className="overflow-hidden rounded-lg border border-border"
                  initial={false}
                  animate={{
                    width: minimapSize,
                    height: minimapSize,
                  }}
                  transition={toolbarTransition}
                >
                  <StickerMinimap
                    stickers={stickers}
                    translate={translate}
                    scale={scale}
                    containerSize={containerSize}
                    onNavigate={handleMinimapNavigate}
                    size={minimapSize}
                  />
                </motion.div>
              }
            />
          </motion.div>

          {/* Placement hint */}
          {placement.isPlacing && stickerPreviewUrl && (
            <div className="absolute top-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-sticker-border bg-sticker-panel px-4 py-2 text-sm text-popover-foreground shadow-md">
              {placement.isSubmitting
                ? "Submitting..."
                : "Click to place your sticker. Scroll to rotate."}
            </div>
          )}

          {/* Empty state */}
          {stickers.length === 0 && !placement.isPlacing && (
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
        </>
      }
    >
      {/* Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing"
        style={{
          ...(placement.isPlacing && stickerPreviewUrl && { cursor: "crosshair" }),
        }}
        {...pointerHandlers}
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
              disabled={placement.isPlacing && !!stickerPreviewUrl}
            />
          ))}

          {/* Placement preview */}
          {placement.isPlacing && stickerPreviewUrl && placement.placementPos && (
            <div
              className="pointer-events-none absolute opacity-70"
              style={{
                left: placement.placementPos.x,
                top: placement.placementPos.y,
                width: 100,
                height: 100,
                transform: `rotate(${placement.placementRotation}deg)`,
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
    </NotchFrame>
  )
}
