"use client"

import { useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { NotchFrameBorder } from "./notch-frame-border"

type NotchFrameProps = {
  children: React.ReactNode
  notchContent: React.ReactNode
  overlays?: React.ReactNode
  notchPad?: number
  cornerRadius?: number
  notchRadius?: number
  notchSize?: { width: number; height: number }
  onContainerResize?: (size: { width: number; height: number }) => void
  className?: string
  clipId?: string
  borderClassName?: string
  fillClassName?: string
}

export function NotchFrame({
  children,
  notchContent,
  overlays,
  notchPad = 6,
  cornerRadius = 14,
  notchRadius = 14,
  notchSize: notchSizeProp,
  onContainerResize,
  className,
  clipId: clipIdProp,
  borderClassName,
  fillClassName,
}: NotchFrameProps) {
  const generatedId = useId().replace(/:/g, "")
  const clipId = clipIdProp ?? `notch-frame-${generatedId}`

  const containerRef = useRef<HTMLDivElement>(null!)
  const notchMeasureRef = useRef<HTMLDivElement>(null!)

  const [containerSize, setContainerSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const [measuredNotchSize, setMeasuredNotchSize] = useState<{
    width: number
    height: number
  } | null>(null)

  // Observe container size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const size = { width, height }
      setContainerSize(size)
      onContainerResize?.(size)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [onContainerResize])

  // Observe notch content size (only when not overridden by prop)
  useEffect(() => {
    if (notchSizeProp) return
    const el = notchMeasureRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setMeasuredNotchSize({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [notchSizeProp])

  const effectiveNotchSize = notchSizeProp ?? measuredNotchSize

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl",
        className
      )}
    >
      {/* Clipped content area */}
      <div
        className="h-full w-full"
        style={{
          ...(containerSize &&
            effectiveNotchSize && {
              clipPath: `url(#${clipId})`,
            }),
        }}
      >
        {children}
      </div>

      {/* Overlays — above frame, no clip */}
      {overlays}

      {/* SVG border with notch cutout */}
      {containerSize && effectiveNotchSize && (
        <NotchFrameBorder
          clipId={clipId}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
          notchWidth={effectiveNotchSize.width + notchPad * 2}
          notchHeight={effectiveNotchSize.height + notchPad}
          cornerRadius={cornerRadius}
          notchRadius={notchRadius}
          borderClassName={borderClassName}
          fillClassName={fillClassName}
        />
      )}

      {/* Notch content — bottom center */}
      <div className="absolute bottom-0 left-1/2 z-40 -translate-x-1/2">
        <div ref={notchMeasureRef}>{notchContent}</div>
      </div>
    </div>
  )
}
