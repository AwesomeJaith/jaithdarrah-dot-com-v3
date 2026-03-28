"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef } from "react"
import {
  useMotionValue,
  useMotionTemplate,
  useSpring,
  motion,
} from "motion/react"
import type { Sticker } from "@/lib/stickers"

type StickerInspectorProps = {
  sticker: Sticker
  onClose: () => void
}

const INTERACT_SPRING = { stiffness: 300, damping: 20 }

export function StickerInspector({ sticker, onClose }: StickerInspectorProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<{ nx: number; ny: number } | null>(null)
  const rafRef = useRef<number | null>(null)

  // Spring-driven tilt and gloss
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const glossX = useMotionValue(50)
  const glossY = useMotionValue(50)

  const springTiltX = useSpring(tiltX, INTERACT_SPRING)
  const springTiltY = useSpring(tiltY, INTERACT_SPRING)
  const springGlossX = useSpring(glossX, INTERACT_SPRING)
  const springGlossY = useSpring(glossY, INTERACT_SPRING)

  // Build the transform and gloss gradient as motion templates
  const transformStyle = useMotionTemplate`rotateX(${springTiltX}deg) rotateY(${springTiltY}deg)`
  const glossGradient = useMotionTemplate`radial-gradient(circle at ${springGlossX}% ${springGlossY}%, rgba(255,255,255,0.8) 0%, transparent 65%)`

  const applyTilt = useCallback(
    (nx: number, ny: number) => {
      // Store latest values, apply once per frame
      pendingRef.current = { nx, ny }
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        const p = pendingRef.current
        if (p) {
          tiltX.set(-p.ny * 20)
          tiltY.set(p.nx * 20)
          glossX.set(50 + p.nx * 35)
          glossY.set(50 + p.ny * 35)
          pendingRef.current = null
        }
        rafRef.current = null
      })
    },
    [tiltX, tiltY, glossX, glossY]
  )

  const resetTilt = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    pendingRef.current = null
    tiltX.set(0)
    tiltY.set(0)
    glossX.set(50)
    glossY.set(50)
  }, [tiltX, tiltY, glossX, glossY])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const card = cardRef.current
      if (!card) return
      const rect = card.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      applyTilt(nx, ny)
    },
    [applyTilt]
  )

  const handlePointerLeave = useCallback(() => {
    resetTilt()
  }, [resetTilt])

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        onClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // Cleanup on unmount
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
          className="relative touch-none select-none"
          style={{
            perspective: "600px",
            width: Math.min(sticker.width * 2, 320),
            height: Math.min(sticker.height * 2, 320),
          }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <motion.div
            className="relative h-full w-full will-change-transform"
            style={{
              transform: transformStyle,
              transformStyle: "preserve-3d",
              outline: "1px solid transparent",
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
            {/* Gloss overlay — masked to sticker shape */}
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-sm opacity-25"
              style={{
                background: glossGradient,
                maskImage: `url(${sticker.image_url})`,
                maskSize: "contain",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskImage: `url(${sticker.image_url})`,
                WebkitMaskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
              }}
            />
          </motion.div>
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
