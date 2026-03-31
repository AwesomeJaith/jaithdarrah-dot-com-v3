"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { springTransition, fadeTransition } from "./notch-cards/constants"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import type { Sticker as StickerType } from "@/lib/stickers"
import { Sticker } from "./sticker"
import { StickerInspector } from "./sticker-inspector"
import { StickerToolbar } from "./sticker-toolbar"
import { StickerMinimap } from "./sticker-minimap"
import { CanvasBar } from "./canvas-bar"
import { NotchFrame } from "@/components/ui/notch-frame"
import {
  useCanvasPanZoom,
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_STEP,
} from "./use-canvas-pan-zoom"
import { useStickerPlacement } from "./use-sticker-placement"
import { useUploadCard } from "./use-upload-card"
import { UploadCard, CARD_WIDTH } from "./notch-cards"
import { RotationDial } from "./rotation-dial"
import { useIsMobile } from "@/hooks/use-is-mobile"

type StickerCanvasProps = {
  initialStickers: StickerType[]
}

const MINIMAP_COMPACT_SIZE = 100
const MINIMAP_DEFAULT_SIZE = 120
const TOOLBAR_MARGIN = 12
const TOOLBAR_GAP = 6
export const NOTCH_PAD = 6
const CORNER_RADIUS = 14
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
  const stickerMapRef = useRef(stickerMap)
  useEffect(() => {
    stickerMapRef.current = stickerMap
  }, [stickerMap])

  const isMobile = useIsMobile()

  // Shared state between placement and upload
  const [stickerPreviewUrl, setStickerPreviewUrl] = useState<string | null>(
    null
  )

  // Inspect mode
  const [inspectedSticker, setInspectedSticker] = useState<StickerType | null>(
    null
  )
  const [inspectOriginRect, setInspectOriginRect] = useState<DOMRect | null>(
    null
  )
  const handleInspect = useCallback(
    (sticker: StickerType, originRect: DOMRect) => {
      setInspectOriginRect(originRect)
      setInspectedSticker(sticker)
    },
    []
  )

  // Layout measurement
  const notchBarRef = useRef<HTMLDivElement>(null!)
  const notchRootRef = useRef<HTMLDivElement>(null!)
  const toolbarRef = useRef<HTMLDivElement>(null!)
  const [zoomRowHeight, setZoomRowHeight] = useState(0)
  const zoomRowRoRef = useRef<ResizeObserver | null>(null)
  const zoomRowRef = useCallback((el: HTMLDivElement | null) => {
    zoomRowRoRef.current?.disconnect()
    if (!el) return
    setZoomRowHeight(el.offsetHeight)
    const ro = new ResizeObserver(() => setZoomRowHeight(el.offsetHeight))
    ro.observe(el)
    zoomRowRoRef.current = ro
  }, [])

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
    stickersRef: stickerMapRef,
    notchRef: notchRootRef,
    toolbarRef,
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
    onPlacementPointerDown: placement.onPointerDown,
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
    notchRootRef,
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
            // Remove stickers within these bounds that are no longer returned
            // (e.g. rejected stickers that were freed up)
            const returnedIds = new Set(data.map((s) => s.id))
            for (const [id, s] of next) {
              if (
                !returnedIds.has(id) &&
                s.x + s.width >= bounds.minX &&
                s.x <= bounds.maxX &&
                s.y + s.height >= bounds.minY &&
                s.y <= bounds.maxY
              ) {
                next.delete(id)
              }
            }
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
      cornerRadius={CORNER_RADIUS}
      notchRadius={CORNER_RADIUS}
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
          notchRootRef={notchRootRef}
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
            ref={toolbarRef}
            className="absolute z-40 transition-opacity duration-200"
            initial={false}
            animate={{
              top: isCompact ? CORNER_RADIUS : toolbarTop,
              width: isCompact ? "auto" : minimapSize,
            }}
            transition={toolbarTransition}
            style={{
              right: isCompact ? CORNER_RADIUS : TOOLBAR_MARGIN,
              opacity: placement.pointerOverToolbar ? 0.3 : 1,
            }}
          >
            <StickerToolbar
              zoomRowRef={zoomRowRef}
              isCompact={isCompact}
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
                isCompact ? undefined : (
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
                      size={minimapSize}
                    />
                  </motion.div>
                )
              }
            />
          </motion.div>

          {/* Placement hint / confirm dialog */}
          <AnimatePresence>
            {placement.isPlacing && stickerPreviewUrl && (
              <motion.div
                className="absolute left-3.5 z-40 max-w-[calc(100%-4.5rem)] sm:left-1/2 sm:max-w-none sm:-translate-x-1/2"
                style={{ top: CORNER_RADIUS }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={springTransition}
              >
                <CanvasBar>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {placement.submitSuccess ? (
                      <motion.span
                        key="success"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={fadeTransition}
                        className="px-1.5 text-brand"
                      >
                        Submitted! It will appear once approved.
                      </motion.span>
                    ) : placement.isSubmitting ? (
                      <motion.span
                        key="submitting"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={fadeTransition}
                        className="px-1.5"
                      >
                        Submitting...
                      </motion.span>
                    ) : placement.overlapError ? (
                      <motion.span
                        key="overlap"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={fadeTransition}
                        className="px-1.5 text-destructive"
                      >
                        Too much overlap, try a different spot!
                      </motion.span>
                    ) : placement.pendingConfirm ? (
                      <motion.div
                        key="confirm"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={fadeTransition}
                        className="flex items-center gap-1"
                      >
                        <span className="px-1.5">Place here?</span>
                        <Button size="sm" onClick={placement.confirmPlacement}>
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={placement.cancelConfirm}
                        >
                          Back
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.span
                        key="hint"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={fadeTransition}
                        className="px-1.5"
                      >
                        <span className="sm:hidden">
                          Drag to position, release to place.
                        </span>
                        <span className="hidden sm:inline">
                          Click to place your sticker. Scroll to rotate.
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </CanvasBar>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile rotation dial */}
          <AnimatePresence>
            {isMobile &&
              placement.pendingConfirm &&
              placement.placementPos &&
              containerSize && (
                <RotationDial
                  rotation={placement.placementRotation}
                  onRotationChange={placement.setPlacementRotation}
                  stickerRect={{
                    x: placement.placementPos.x * scale + translate.x,
                    y: placement.placementPos.y * scale + translate.y,
                    width: placement.placementSize.width * scale,
                    height: placement.placementSize.height * scale,
                  }}
                  containerWidth={containerSize.width}
                  containerHeight={containerSize.height}
                />
              )}
          </AnimatePresence>

          {/* Sticker inspector */}
          <AnimatePresence>
            {inspectedSticker && (
              <StickerInspector
                key={inspectedSticker.id}
                sticker={inspectedSticker}
                originRect={inspectOriginRect}
                onClose={() => {
                  setInspectedSticker(null)
                  setInspectOriginRect(null)
                }}
              />
            )}
          </AnimatePresence>
        </>
      }
    >
      {/* Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab touch-none overflow-hidden rounded-xl active:cursor-grabbing"
        style={{
          ...(placement.isPlacing &&
            stickerPreviewUrl && { cursor: "crosshair" }),
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

          {/* Empty state — centered above the origin crosshair */}
          {stickers.length === 0 && !placement.isPlacing && (
            <div
              className="absolute -translate-x-1/2 text-center whitespace-nowrap text-muted-foreground"
              style={{ left: 0, bottom: 40 }}
            >
              <p className="text-lg font-medium">No stickers yet!</p>
              <p className="mt-1 text-sm">Be the first to place one.</p>
            </div>
          )}

          {/* Placed stickers */}
          {stickers.map((sticker) =>
            sticker.status === "pending" ? (
              <Sticker
                key={sticker.id}
                sticker={sticker}
                placementPos={placement.placementPos}
                placementSize={placement.placementSize}
                placementAlphaMask={placement.placementAlphaMask}
              />
            ) : (
              <Sticker
                key={sticker.id}
                sticker={sticker}
                onInspect={handleInspect}
                disabled={placement.isPlacing && !!stickerPreviewUrl}
              />
            )
          )}

          {/* Placement preview */}
          {placement.isPlacing &&
            stickerPreviewUrl &&
            placement.placementPos && (
              <div
                className={`pointer-events-none absolute ${placement.pendingConfirm ? "opacity-100" : "opacity-70"}`}
                style={{
                  left: placement.placementPos.x,
                  top: placement.placementPos.y,
                  width: placement.placementSize.width,
                  height: placement.placementSize.height,
                  transform: `rotate(${placement.placementRotation}deg)`,
                }}
              >
                <Image
                  src={stickerPreviewUrl}
                  alt="Sticker preview"
                  className="object-contain"
                  draggable={false}
                  fill
                  sizes={`${placement.placementSize.width}px`}
                  unoptimized
                />
              </div>
            )}
        </div>
      </div>
    </NotchFrame>
  )
}
