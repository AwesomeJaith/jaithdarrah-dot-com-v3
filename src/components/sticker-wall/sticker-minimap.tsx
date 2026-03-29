"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import type { Sticker } from "@/lib/stickers"

type StickerMinimapProps = {
  stickers: Sticker[]
  translate: { x: number; y: number }
  scale: number
  containerSize: { width: number; height: number } | null
  onNavigate: (worldX: number, worldY: number) => void
  size?: number
}

const DEFAULT_SIZE = 120
const PADDING = 8

export function StickerMinimap({
  stickers,
  translate,
  scale,
  containerSize,
  onNavigate,
  size: minimapSize = DEFAULT_SIZE,
}: StickerMinimapProps) {
  // Symmetric bounds around origin so viewport centers in minimap
  // when view is centered on origin
  const worldBounds = useMemo(() => {
    let minX = 0
    let minY = 0
    let maxX = 0
    let maxY = 0

    for (const s of stickers) {
      minX = Math.min(minX, s.x)
      minY = Math.min(minY, s.y)
      maxX = Math.max(maxX, s.x + s.width)
      maxY = Math.max(maxY, s.y + s.height)
    }

    // Pad by half the viewport size so the viewport rect fits in the minimap
    const padX = containerSize
      ? Math.max(containerSize.width / scale / 2, 200)
      : 200
    const padY = containerSize
      ? Math.max(containerSize.height / scale / 2, 200)
      : 200

    // Symmetric around origin
    const extentX = Math.max(Math.abs(minX), Math.abs(maxX)) + padX
    const extentY = Math.max(Math.abs(minY), Math.abs(maxY)) + padY
    return {
      minX: -extentX,
      minY: -extentY,
      maxX: extentX,
      maxY: extentY,
    }
  }, [stickers, containerSize, scale])

  const worldWidth = worldBounds.maxX - worldBounds.minX
  const worldHeight = worldBounds.maxY - worldBounds.minY

  // Fit world into minimap maintaining aspect ratio
  const mapScale = useMemo(() => {
    if (worldWidth === 0 || worldHeight === 0) return 1
    const inner = minimapSize - PADDING * 2
    return Math.min(inner / worldWidth, inner / worldHeight)
  }, [worldWidth, worldHeight, minimapSize])

  const mapW = worldWidth * mapScale
  const mapH = worldHeight * mapScale
  const offsetX = (minimapSize - mapW) / 2
  const offsetY = (minimapSize - mapH) / 2

  // Viewport rectangle in minimap coordinates
  const viewport = useMemo(() => {
    if (!containerSize) return null
    const vMinX = (0 - translate.x) / scale
    const vMinY = (0 - translate.y) / scale
    const vMaxX = (containerSize.width - translate.x) / scale
    const vMaxY = (containerSize.height - translate.y) / scale
    return {
      x: (vMinX - worldBounds.minX) * mapScale + offsetX,
      y: (vMinY - worldBounds.minY) * mapScale + offsetY,
      width: (vMaxX - vMinX) * mapScale,
      height: (vMaxY - vMinY) * mapScale,
    }
  }, [containerSize, translate, scale, worldBounds, mapScale, offsetX, offsetY])

  // Drag state for viewport rectangle
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const minimapToWorld = useCallback(
    (mx: number, my: number) => ({
      x: (mx - offsetX) / mapScale + worldBounds.minX,
      y: (my - offsetY) / mapScale + worldBounds.minY,
    }),
    [offsetX, offsetY, mapScale, worldBounds]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      // Scale from rendered size to viewBox (logical) coordinates
      const sx = minimapSize / rect.width
      const sy = minimapSize / rect.height
      const mx = (e.clientX - rect.left) * sx
      const my = (e.clientY - rect.top) * sy

      // Check if pointer is inside the viewport rect
      if (
        viewport &&
        mx >= viewport.x &&
        mx <= viewport.x + viewport.width &&
        my >= viewport.y &&
        my <= viewport.y + viewport.height
      ) {
        // Start dragging — record offset from viewport center
        const vpCenterX = viewport.x + viewport.width / 2
        const vpCenterY = viewport.y + viewport.height / 2
        dragRef.current = { offsetX: mx - vpCenterX, offsetY: my - vpCenterY }
        setIsDragging(true)
        e.currentTarget.setPointerCapture(e.pointerId)
        e.stopPropagation()
      } else {
        // Click outside viewport → jump navigate
        const world = minimapToWorld(mx, my)
        onNavigate(world.x, world.y)
      }
    },
    [viewport, minimapToWorld, onNavigate, minimapSize]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return
      const rect = e.currentTarget.getBoundingClientRect()
      const sx = minimapSize / rect.width
      const sy = minimapSize / rect.height
      const mx = (e.clientX - rect.left) * sx - dragRef.current.offsetX
      const my = (e.clientY - rect.top) * sy - dragRef.current.offsetY
      const world = minimapToWorld(mx, my)
      onNavigate(world.x, world.y)
    },
    [minimapToWorld, onNavigate, minimapSize]
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  if (stickers.length === 0) return null

  return (
    <div
      className="h-full w-full rounded-lg border border-sticker-border bg-sticker-panel shadow-md"
      style={{
        cursor: isDragging ? "grabbing" : "pointer",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg
        viewBox={`0 0 ${minimapSize} ${minimapSize}`}
        className="h-full w-full overflow-hidden rounded-lg"
      >
        {/* Origin crosshair */}
        <line
          x1={(0 - worldBounds.minX) * mapScale + offsetX}
          y1={(0 - worldBounds.minY) * mapScale + offsetY - 3}
          x2={(0 - worldBounds.minX) * mapScale + offsetX}
          y2={(0 - worldBounds.minY) * mapScale + offsetY + 3}
          className="stroke-muted-foreground/30"
          strokeWidth={1}
        />
        <line
          x1={(0 - worldBounds.minX) * mapScale + offsetX - 3}
          y1={(0 - worldBounds.minY) * mapScale + offsetY}
          x2={(0 - worldBounds.minX) * mapScale + offsetX + 3}
          y2={(0 - worldBounds.minY) * mapScale + offsetY}
          className="stroke-muted-foreground/30"
          strokeWidth={1}
        />

        {/* Sticker thumbnails */}
        {stickers.map((sticker) => {
          const sx = (sticker.x - worldBounds.minX) * mapScale + offsetX
          const sy = (sticker.y - worldBounds.minY) * mapScale + offsetY
          const sw = Math.max(sticker.width * mapScale, 2)
          const sh = Math.max(sticker.height * mapScale, 2)
          const cx = sx + sw / 2
          const cy = sy + sh / 2

          return (
            <image
              key={sticker.id}
              href={sticker.blur_data_url ?? sticker.image_url}
              x={sx}
              y={sy}
              width={sw}
              height={sh}
              transform={`rotate(${sticker.rotation} ${cx} ${cy})`}
              preserveAspectRatio="xMidYMid meet"
            />
          )
        })}

        {/* Viewport indicator */}
        {viewport && (
          <rect
            x={viewport.x}
            y={viewport.y}
            width={viewport.width}
            height={viewport.height}
            className="fill-foreground/5 stroke-foreground/50"
            strokeWidth={1}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          />
        )}
      </svg>
    </div>
  )
}
