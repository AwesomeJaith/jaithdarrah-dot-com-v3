"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
  motion,
  AnimatePresence,
  type MotionValue,
} from "motion/react"
import type { Sticker } from "@/lib/stickers"
import {
  effectMaskStyles,
  resolveEffect,
  EFFECT_GRADIENTS,
} from "./sticker-effects"
import { decodeAlphaMask, GRID_SIZE } from "@/lib/overlap"
import { TextMorph } from "torph/react"
import { PiCursorFill } from "react-icons/pi"
import { BsFillHandIndexThumbFill } from "react-icons/bs"

type StickerInspectorProps = {
  sticker: Sticker
  originRect: DOMRect | null
  onClose: () => void
}

const INTERACT_SPRING = { stiffness: 300, damping: 20 }
const INSPECTOR_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
  mass: 0.8,
}
const INSPECTOR_SPRING_STICKER = { ...INSPECTOR_SPRING, delay: 0.1 }
const INSPECTOR_SPRING_INFO = { ...INSPECTOR_SPRING, delay: 0.05 }
const INSPECTOR_SIZE = 320

/** Pointer-driven holographic gradient overlay */
function HoloOverlay({
  effect,
  glossX,
  glossY,
  imageUrl,
  rotation,
}: {
  effect: string
  glossX: MotionValue<number>
  glossY: MotionValue<number>
  imageUrl: string
  rotation: number
}) {
  const gradientFn = EFFECT_GRADIENTS[effect]
  const holoGradient = useTransform([glossX, glossY], ([px, py]) =>
    gradientFn(px as number, py as number)
  )
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{
        background: holoGradient,
        rotate: `${rotation}deg`,
        ...effectMaskStyles(imageUrl),
      }}
    />
  )
}

export function StickerInspector({
  sticker,
  originRect,
  onClose,
}: StickerInspectorProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<{ nx: number; ny: number } | null>(null)
  const rafRef = useRef<number | null>(null)
  const [rainbowOverride, setRainbowOverride] = useState(false)
  const [showTiltHint, setShowTiltHint] = useState(
    () =>
      typeof window !== "undefined" &&
      !localStorage.getItem("jaith-darrah-sticker-tilt-hint")
  )

  const dismissTiltHint = useCallback(() => {
    setShowTiltHint(false)
    localStorage.setItem("jaith-darrah-sticker-tilt-hint", "1")
  }, [])

  useEffect(() => {
    if (!showTiltHint) return
    const timer = setTimeout(dismissTiltHint, 10000)
    return () => clearTimeout(timer)
  }, [showTiltHint, dismissTiltHint])

  const hintMotion = useMemo(() => {
    const zero = { x: 0, y: 0, travel: 70, travelV: 25 }
    if (!showTiltHint || !sticker.alpha_mask) return zero
    const bytes = decodeAlphaMask(sticker.alpha_mask)

    const isOpaque = (gx: number, gy: number) => {
      if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return false
      const bit = gy * GRID_SIZE + gx
      return !!(bytes[bit >> 3] & (1 << (bit & 7)))
    }

    // Centroid in grid space
    let sumX = 0
    let sumY = 0
    let count = 0
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        if (isOpaque(gx, gy)) {
          sumX += gx
          sumY += gy
          count++
        }
      }
    }
    if (count === 0) return zero
    const centX = sumX / count
    const centY = sumY / count

    // Probe from centroid in each direction to find safe travel distance (staying within opaque)
    const probe = (dx: number, dy: number) => {
      let steps = 0
      let gx = Math.round(centX)
      let gy = Math.round(centY)
      while (isOpaque(gx + dx, gy + dy)) {
        gx += dx
        gy += dy
        steps++
      }
      return steps
    }
    const stepsRight = probe(1, 0)
    const stepsLeft = probe(-1, 0)
    const stepsDown = probe(0, 1)
    const stepsUp = probe(0, -1)

    const displayW = Math.min(sticker.width * 2, INSPECTOR_SIZE)
    const displayH = Math.min(sticker.height * 2, INSPECTOR_SIZE)
    const cellW = displayW / GRID_SIZE
    const cellH = displayH / GRID_SIZE
    const MAX_H = 70
    const MAX_V = 25
    const toPx = (steps: number, cellPx: number, max: number) =>
      Math.min(steps * cellPx, max)

    const pxRight = toPx(stepsRight, cellW, MAX_H)
    const pxLeft = toPx(stepsLeft, cellW, MAX_H)
    const pxDown = toPx(stepsDown, cellH, MAX_V)
    const pxUp = toPx(stepsUp, cellH, MAX_V)

    // Use symmetric travel; shift resting position to midpoint of left/right span
    const halfH = Math.min(pxRight, pxLeft)
    const halfV = Math.min(pxDown, pxUp)
    const centroidX = (centX / (GRID_SIZE - 1) - 0.5) * displayW
    const centroidY = (centY / (GRID_SIZE - 1) - 0.5) * displayH
    const shiftX = (pxRight - pxLeft) / 2
    const shiftY = (pxDown - pxUp) / 2

    return {
      x: centroidX + shiftX,
      y: centroidY + shiftY,
      travel: halfH,
      travelV: halfV,
    }
  }, [showTiltHint, sticker.alpha_mask, sticker.width, sticker.height])

  // Sample sticker image at centroid to pick a contrasting hint icon color
  const [hintDark, setHintDark] = useState(false)
  useEffect(() => {
    if (!showTiltHint) return
    let cancelled = false
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      if (cancelled) return
      const canvas = document.createElement("canvas")
      const size = 64
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, size, size)
      // Sample center region — most stickers fill the frame
      const r = 8
      const mid = size / 2
      const data = ctx.getImageData(mid - r, mid - r, r * 2, r * 2).data
      let lum = 0
      let count = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue
        lum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        count++
      }
      if (count > 0) setHintDark(lum / count > 140)
    }
    img.onerror = () => {
      if (!cancelled) setHintDark(true)
    }
    img.src = sticker.image_url
    return () => {
      cancelled = true
      img.onload = null
      img.onerror = null
      img.src = ""
    }
  }, [showTiltHint, sticker.image_url])

  // Store originRect in a ref so it persists during exit animation
  const originRectRef = useRef(originRect)
  if (originRect) originRectRef.current = originRect

  const activeEffect = rainbowOverride
    ? "rainbow"
    : resolveEffect(sticker.effect)

  // Compute morph origin offset from natural centered position
  const origin = originRectRef.current
  const offsetX = origin
    ? origin.left + origin.width / 2 - window.innerWidth / 2
    : 0
  const offsetY = origin
    ? origin.top + origin.height / 2 - window.innerHeight / 2
    : 0
  const initialScale = origin
    ? Math.min(origin.width, origin.height) / INSPECTOR_SIZE
    : 0.8

  // Spring-driven tilt and gloss
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const glossX = useMotionValue(50)
  const glossY = useMotionValue(50)

  const springTiltX = useSpring(tiltX, INTERACT_SPRING)
  const springTiltY = useSpring(tiltY, INTERACT_SPRING)
  const springGlossX = useSpring(glossX, INTERACT_SPRING)
  const springGlossY = useSpring(glossY, INTERACT_SPRING)

  // Glare sweep position — maps glossX (15..85) to a wider sweep range (-20..120)
  // so the glare line can travel fully across the sticker
  const glareSweep = useTransform(springGlossX, [15, 85], [-20, 120])

  // Hide glare when not tilting — fade based on distance from center
  const glareOpacity = useTransform(
    [springGlossX, springGlossY],
    ([gx, gy]) => {
      const dist = Math.hypot((gx as number) - 50, (gy as number) - 50)
      return Math.min(dist / 10, 1)
    }
  )

  // Build the transform and gloss/holo gradients as motion templates
  const transformStyle = useMotionTemplate`rotateX(${springTiltX}deg) rotateY(${springTiltY}deg)`
  const glossGradient = useMotionTemplate`radial-gradient(circle at ${springGlossX}% ${springGlossY}%, rgba(255,255,255,0.8) 0%, transparent 65%)`
  const glareGradient = useMotionTemplate`linear-gradient(-65deg, transparent calc(${glareSweep}% - 4%), oklch(1 0 0 / 0.35) ${glareSweep}%, transparent calc(${glareSweep}% + 4%))`

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
    <motion.div
      className="fixed inset-0 z-9999 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Blurred backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />

      {/* Content wrapper — morphs from sticker origin to center */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6"
        onClick={(e) => e.stopPropagation()}
        initial={{
          x: offsetX,
          y: offsetY,
          scale: initialScale,
          opacity: 0.5,
        }}
        animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        exit={{
          x: offsetX,
          y: offsetY,
          scale: initialScale,
          opacity: 0,
        }}
        transition={INSPECTOR_SPRING}
      >
        {/* Sticker image with 3D tilt — separates from card with delay */}
        <motion.div
          ref={cardRef}
          className="relative flex aspect-square w-80 touch-none items-center justify-center select-none"
          style={{ perspective: "600px" }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetTilt}
          initial={{ opacity: 0, y: 40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.8 }}
          transition={INSPECTOR_SPRING_STICKER}
        >
          <motion.div
            className="relative will-change-transform"
            style={{
              width: Math.min(sticker.width * 2, INSPECTOR_SIZE),
              height: Math.min(sticker.height * 2, INSPECTOR_SIZE),
              transform: transformStyle,
              transformStyle: "preserve-3d",
              outline: "1px solid transparent",
            }}
          >
            <Image
              src={sticker.image_url}
              alt={`Sticker by ${sticker.username}`}
              fill
              sizes={`${INSPECTOR_SIZE}px`}
              className="object-contain drop-shadow-2xl"
              draggable={false}
              placeholder={sticker.blur_data_url ? "blur" : "empty"}
              blurDataURL={sticker.blur_data_url ?? undefined}
              style={{ rotate: `${sticker.rotation}deg` }}
            />
            {/* Holographic effect overlay — only for rainbow */}
            {activeEffect === "rainbow" && (
              <HoloOverlay
                effect={activeEffect}
                glossX={springGlossX}
                glossY={springGlossY}
                imageUrl={sticker.image_url}
                rotation={sticker.rotation}
              />
            )}
            {/* Glare line — pointer-driven shimmer stripe, hidden at rest */}
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{
                background: glareGradient,
                opacity: glareOpacity,
                rotate: `${sticker.rotation}deg`,
                ...effectMaskStyles(sticker.image_url),
              }}
            />
            {/* Gloss overlay — masked to sticker shape */}
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-sm opacity-25"
              style={{
                background: glossGradient,
                rotate: `${sticker.rotation}deg`,
                ...effectMaskStyles(sticker.image_url),
              }}
            />
          </motion.div>

          {/* Tilt interaction hint — loops until user interacts */}
          <AnimatePresence>
            {showTiltHint && (
              <motion.div
                className={`pointer-events-none absolute inset-0 flex items-center justify-center drop-shadow-lg ${hintDark ? "text-black/90" : "text-white/90"}`}
                style={{
                  marginLeft: hintMotion.x,
                  marginTop: hintMotion.y,
                }}
                initial={{ opacity: 0 }}
                animate={{
                  x: [0, hintMotion.travel, 0, 0, -hintMotion.travel, 0],
                  y: [0, 0, 0, hintMotion.travelV, 0, 0],
                  opacity: 1,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  x: {
                    duration: 2.5,
                    delay: 0.6,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  },
                  y: {
                    duration: 2.5,
                    delay: 0.6,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0.5,
                  },
                  opacity: { duration: 0.3, delay: 0.6 },
                }}
              >
                <PiCursorFill className="hidden size-6 sm:block" />
                <BsFillHandIndexThumbFill className="size-6 sm:hidden" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Info card */}
        <motion.div
          className="w-80 origin-bottom rounded-xl shadow-xl"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={INSPECTOR_SPRING_INFO}
        >
          <button
            onClick={() => setRainbowOverride((v) => !v)}
            className={`relative w-full cursor-pointer overflow-hidden rounded-t-xl px-4 py-2 text-sm font-medium transition-[padding,margin] active:mt-1.5 active:pt-0.5 ${
              rainbowOverride
                ? "bg-muted text-popover-foreground"
                : "text-popover-foreground"
            }`}
            style={
              !rainbowOverride
                ? {
                    background:
                      "linear-gradient(90deg, oklch(0.75 0.15 0 / 0.15), oklch(0.75 0.15 60 / 0.15), oklch(0.75 0.15 120 / 0.15), oklch(0.75 0.15 180 / 0.15), oklch(0.75 0.15 240 / 0.15), oklch(0.75 0.15 300 / 0.15), oklch(0.75 0.15 0 / 0.15))",
                    backgroundSize: "200% 100%",
                    animation: "rainbow-shimmer 1.5s linear infinite",
                  }
                : undefined
            }
          >
            {!rainbowOverride && (
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(-65deg, transparent calc(50% - 4%), oklch(1 0 0 / 0.3) 50%, transparent calc(50% + 4%))",
                  backgroundSize: "200% 100%",
                  animation: "rainbow-shimmer 8s ease-in-out infinite",
                }}
              />
            )}

            <TextMorph>
              {rainbowOverride ? "Make it normal." : "Make it rainbow!"}
            </TextMorph>
          </button>
          <div className="rounded-b-xl bg-popover px-5 py-4 text-center">
            <p className="text-sm font-semibold text-popover-foreground">
              Placed by {sticker.username}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formattedDate}
            </p>
            {sticker.message && (
              <p className="mt-2 text-sm text-popover-foreground/80 italic">
                &ldquo;{sticker.message}&rdquo;
              </p>
            )}
          </div>
        </motion.div>

        {/* Dismiss hint */}
        <motion.p
          className="text-xs text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <span className="sm:hidden">Tap outside to close</span>
          <span className="hidden sm:inline">
            Click outside or press Esc to close
          </span>
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
