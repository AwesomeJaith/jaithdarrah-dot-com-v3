"use client"

import { useRef } from "react"
import { motion } from "motion/react"

const DIAL_SIZE = 60
const DIAL_GAP = 12
const EDGE_PAD = 8
const DOT_RADIUS_RATIO = 0.75

type StickerRect = { x: number; y: number; width: number; height: number }

type RotationDialProps = {
  rotation: number
  onRotationChange: (rotation: number) => void
  stickerRect: StickerRect
  containerHeight: number
  containerWidth: number
}

function pickPosition(
  s: StickerRect,
  cw: number,
  ch: number
): { top: number; left: number } {
  const cx = s.x + s.width / 2
  const cy = s.y + s.height / 2

  // Candidate positions: below, above, right, left of the sticker
  const candidates: { top: number; left: number; score: number }[] = [
    {
      // Below
      top: s.y + s.height + DIAL_GAP,
      left: cx - DIAL_SIZE / 2,
      score: ch - (s.y + s.height + DIAL_GAP + DIAL_SIZE),
    },
    {
      // Above
      top: s.y - DIAL_GAP - DIAL_SIZE,
      left: cx - DIAL_SIZE / 2,
      score: s.y - DIAL_GAP - DIAL_SIZE,
    },
    {
      // Right
      top: cy - DIAL_SIZE / 2,
      left: s.x + s.width + DIAL_GAP,
      score: cw - (s.x + s.width + DIAL_GAP + DIAL_SIZE),
    },
    {
      // Left
      top: cy - DIAL_SIZE / 2,
      left: s.x - DIAL_GAP - DIAL_SIZE,
      score: s.x - DIAL_GAP - DIAL_SIZE,
    },
  ]

  // Pick the candidate with the most remaining space (score), filtering out those that don't fit
  const best = candidates.sort((a, b) => b.score - a.score)[0]

  return {
    top: Math.max(EDGE_PAD, Math.min(best.top, ch - DIAL_SIZE - EDGE_PAD)),
    left: Math.max(EDGE_PAD, Math.min(best.left, cw - DIAL_SIZE - EDGE_PAD)),
  }
}

export function RotationDial({
  rotation,
  onRotationChange,
  stickerRect,
  containerHeight,
  containerWidth,
}: RotationDialProps) {
  const dragRef = useRef<{
    startAngle: number
    startRotation: number
    centerX: number
    centerY: number
  } | null>(null)

  const { top, left } = pickPosition(
    stickerRect,
    containerWidth,
    containerHeight
  )

  const displayAngle = Math.round(((rotation % 360) + 360) % 360)

  const r = DIAL_SIZE / 2
  const rad = (rotation - 90) * (Math.PI / 180)
  const dotDist = r * DOT_RADIUS_RATIO
  const dotX = r + dotDist * Math.cos(rad)
  const dotY = r + dotDist * Math.sin(rad)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-40 touch-none rounded-full border border-border bg-popover shadow-md select-none"
      style={{
        top,
        left,
        width: DIAL_SIZE,
        height: DIAL_SIZE,
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        const rect = e.currentTarget.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const startAngle =
          Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
        dragRef.current = {
          startAngle,
          startRotation: rotation,
          centerX,
          centerY,
        }
      }}
      onPointerMove={(e) => {
        if (!dragRef.current) return
        e.stopPropagation()
        const { centerX, centerY, startAngle, startRotation } = dragRef.current
        const currentAngle =
          Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI)
        onRotationChange(startRotation + (currentAngle - startAngle))
      }}
      onPointerUp={(e) => {
        if (!dragRef.current) return
        e.stopPropagation()
        dragRef.current = null
      }}
      onPointerCancel={() => {
        dragRef.current = null
      }}
    >
      <span className="absolute inset-0 flex items-center justify-center text-xs text-popover-foreground tabular-nums">
        {displayAngle}°
      </span>
      <svg
        className="absolute inset-0"
        width={DIAL_SIZE}
        height={DIAL_SIZE}
        viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
      >
        <circle cx={dotX} cy={dotY} r={3} className="fill-foreground" />
      </svg>
    </motion.div>
  )
}
