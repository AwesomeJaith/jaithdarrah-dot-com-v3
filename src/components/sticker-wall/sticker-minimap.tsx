"use client"

import { useCallback, useMemo } from "react"
import type { Sticker } from "@/lib/stickers"

type StickerMinimapProps = {
  stickers: Sticker[]
  translate: { x: number; y: number }
  scale: number
  containerSize: { width: number; height: number } | null
  size?: number
}

const DEFAULT_SIZE = 120
const PADDING = 8
const ARROW_MARGIN = 10
const ARROW_SIZE = 4

export function StickerMinimap({
  stickers,
  translate,
  scale,
  containerSize,
  size: minimapSize = DEFAULT_SIZE,
}: StickerMinimapProps) {
  const half = minimapSize / 2

  // Viewport center in world coordinates
  const viewCenter = useMemo(() => {
    if (!containerSize) return { x: 0, y: 0 }
    return {
      x: (containerSize.width / 2 - translate.x) / scale,
      y: (containerSize.height / 2 - translate.y) / scale,
    }
  }, [containerSize, translate, scale])

  // Determine scale: fit all stickers + viewport into the minimap
  // Scale based on sticker extent from origin + viewport size — stable across panning
  const mapScale = useMemo(() => {
    let extent = 200

    for (const s of stickers) {
      extent = Math.max(
        extent,
        Math.abs(s.x) + s.width,
        Math.abs(s.y) + s.height
      )
    }

    // Ensure the viewport rect fits in the minimap at current zoom
    if (containerSize) {
      extent = Math.max(
        extent,
        containerSize.width / scale / 2,
        containerSize.height / scale / 2
      )
    }

    const inner = minimapSize - PADDING * 2
    return inner / (extent * 2)
  }, [stickers, containerSize, scale, minimapSize])

  // Convert world to minimap — viewport center is always at minimap center
  const toMap = useCallback(
    (wx: number, wy: number) => ({
      x: half + (wx - viewCenter.x) * mapScale,
      y: half + (wy - viewCenter.y) * mapScale,
    }),
    [half, viewCenter, mapScale]
  )

  // Viewport rect — always centered, only size changes with zoom
  const viewport = useMemo(() => {
    if (!containerSize) return null
    const vw = (containerSize.width / scale) * mapScale
    const vh = (containerSize.height / scale) * mapScale
    return {
      x: half - vw / 2,
      y: half - vh / 2,
      width: vw,
      height: vh,
    }
  }, [containerSize, scale, mapScale, half])

  // Origin position in minimap coords
  const origin = useMemo(() => toMap(0, 0), [toMap])

  // Arrow pointing toward origin when it's off the minimap
  const offscreenArrow = useMemo(() => {
    if (
      origin.x >= 0 &&
      origin.x <= minimapSize &&
      origin.y >= 0 &&
      origin.y <= minimapSize
    )
      return null

    const cx = Math.max(
      ARROW_MARGIN,
      Math.min(minimapSize - ARROW_MARGIN, origin.x)
    )
    const cy = Math.max(
      ARROW_MARGIN,
      Math.min(minimapSize - ARROW_MARGIN, origin.y)
    )
    const angle = (Math.atan2(origin.y - cy, origin.x - cx) * 180) / Math.PI

    return { cx, cy, angle }
  }, [origin, minimapSize])

  if (stickers.length === 0) return null

  return (
    <div className="pointer-events-none h-full w-full rounded-lg border border-sticker-border bg-sticker-panel shadow-md select-none">
      <svg
        viewBox={`0 0 ${minimapSize} ${minimapSize}`}
        className="h-full w-full overflow-hidden rounded-lg"
      >
        {/* Origin crosshair */}
        <line
          x1={origin.x}
          y1={origin.y - 3}
          x2={origin.x}
          y2={origin.y + 3}
          className="stroke-muted-foreground/30"
          strokeWidth={1}
        />
        <line
          x1={origin.x - 3}
          y1={origin.y}
          x2={origin.x + 3}
          y2={origin.y}
          className="stroke-muted-foreground/30"
          strokeWidth={1}
        />

        {/* Sticker thumbnails */}
        {stickers
          .filter((s) => s.status === "approved")
          .map((sticker) => {
            const pos = toMap(sticker.x, sticker.y)
            const sw = Math.max(sticker.width * mapScale, 2)
            const sh = Math.max(sticker.height * mapScale, 2)
            const cx = pos.x + sw / 2
            const cy = pos.y + sh / 2

            const href = sticker.image_url

            return href ? (
              <image
                key={sticker.id}
                href={href}
                x={pos.x}
                y={pos.y}
                width={sw}
                height={sh}
                transform={`rotate(${sticker.rotation} ${cx} ${cy})`}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              <rect
                key={sticker.id}
                x={pos.x}
                y={pos.y}
                width={sw}
                height={sh}
                transform={`rotate(${sticker.rotation} ${cx} ${cy})`}
                className="fill-muted-foreground/20"
              />
            )
          })}

        {/* Viewport indicator — always centered */}
        {viewport && (
          <rect
            x={viewport.x}
            y={viewport.y}
            width={viewport.width}
            height={viewport.height}
            className="fill-foreground/5 stroke-foreground/50"
            strokeWidth={1}
          />
        )}

        {/* Off-screen arrow — points toward origin */}
        {offscreenArrow && (
          <g
            transform={`translate(${offscreenArrow.cx}, ${offscreenArrow.cy}) rotate(${offscreenArrow.angle})`}
          >
            <polygon
              points={`${ARROW_SIZE},0 ${-ARROW_SIZE},${-ARROW_SIZE} ${-ARROW_SIZE},${ARROW_SIZE}`}
              className="fill-foreground/70"
            />
          </g>
        )}
      </svg>
    </div>
  )
}
