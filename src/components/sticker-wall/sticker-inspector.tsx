"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Sticker } from "@/lib/stickers"

type StickerInspectorProps = {
  sticker: Sticker
  onClose: () => void
}

const INITIAL_TILT = { x: 0, y: 0 }
const INITIAL_GLOSS = { x: 50, y: 50 }

export function StickerInspector({ sticker, onClose }: StickerInspectorProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState(INITIAL_TILT)
  const [gloss, setGloss] = useState(INITIAL_GLOSS)
  const rafRef = useRef<number | null>(null)

  const applyTilt = useCallback((nx: number, ny: number) => {
    // nx, ny are normalized -1..1 relative to card center
    const rotateY = nx * 20
    const rotateX = -ny * 20
    const glossX = 50 + nx * 35
    const glossY = 50 + ny * 35
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ x: rotateX, y: rotateY })
      setGloss({ x: glossX, y: glossY })
    })
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current
      if (!card) return
      const rect = card.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      applyTilt(nx, ny)
    },
    [applyTilt]
  )

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setTilt(INITIAL_TILT)
      setGloss(INITIAL_GLOSS)
    })
  }, [])

  // Touch / pointer tilt
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") return // handled by mousemove
      const card = cardRef.current
      if (!card) return
      const rect = card.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      applyTilt(nx, ny)
    },
    [applyTilt]
  )

  // Device orientation (mobile gyroscope)
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      // gamma: left/right tilt (-90..90), beta: front/back tilt (-180..180)
      const nx = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30))
      const ny = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 30) / 30))
      applyTilt(nx, ny)
    }
    window.addEventListener("deviceorientation", handler)
    return () => window.removeEventListener("deviceorientation", handler)
  }, [applyTilt])

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        // Blur any focused sticker so it doesn't get highlighted after close
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        onClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // Cleanup raf on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const formattedDate = useMemo(
    () =>
      new Date(sticker.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [sticker.created_at]
  )

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Card — stop propagation so clicking the sticker itself doesn't close */}
      <div
        className="relative z-10 flex flex-col items-center gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticker image with 3D tilt */}
        <div
          ref={cardRef}
          className="relative select-none"
          style={{
            perspective: "800px",
            width: Math.min(sticker.width * 2, 320),
            height: Math.min(sticker.height * 2, 320),
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onPointerMove={handlePointerMove}
        >
          <div
            className="relative h-full w-full"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: "transform 0.08s ease-out",
              transformStyle: "preserve-3d",
            }}
          >
            <Image
              src={sticker.image_url}
              alt={`Sticker by ${sticker.username}`}
              fill
              className="object-contain drop-shadow-2xl"
              draggable={false}
              placeholder={sticker.blur_data_url ? "blur" : "empty"}
              blurDataURL={sticker.blur_data_url ?? undefined}
            />
            {/* Gloss overlay */}
            <div
              className="pointer-events-none absolute inset-0 rounded-sm opacity-25"
              style={{
                background: `radial-gradient(circle at ${gloss.x}% ${gloss.y}%, rgba(255,255,255,0.8) 0%, transparent 65%)`,
                transition: "background 0.08s ease-out",
              }}
            />
          </div>
        </div>

        {/* Info card */}
        <div className="animate-in rounded-xl border border-border bg-popover px-5 py-4 text-center shadow-xl duration-200 fade-in slide-in-from-bottom-3">
          <p className="text-sm font-semibold text-popover-foreground">
            Placed by {sticker.username}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formattedDate}
          </p>
          {sticker.message && (
            <p className="mt-2 max-w-xs text-sm text-popover-foreground/80 italic">
              &ldquo;{sticker.message}&rdquo;
            </p>
          )}
        </div>

        {/* Dismiss hint */}
        <p className="text-xs text-white/40">
          Click outside or press Esc to close
        </p>
      </div>
    </div>
  )
}
