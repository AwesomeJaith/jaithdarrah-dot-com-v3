"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import { MORPH_SPEED } from "./constants"

export function CardPage({
  show,
  cardWidth,
  minHeight,
  onHeight,
  children,
}: {
  show: boolean
  cardWidth: number
  minHeight?: number
  onHeight?: (h: number) => void
  children: React.ReactNode
}) {
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = measureRef.current
    if (!el || !onHeight) return
    const ro = new ResizeObserver(() => onHeight(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeight])

  return (
    <div
      className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col gap-3 p-4"
      style={{
        width: cardWidth,
        minHeight,
        pointerEvents: show ? "all" : "none",
        zIndex: show ? 1 : 0,
      }}
      ref={measureRef}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.15 * MORPH_SPEED,
              delay: show ? 0.1 * MORPH_SPEED : 0,
            }}
            className="flex flex-1 flex-col gap-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
