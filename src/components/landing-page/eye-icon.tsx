"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useIsMobile } from "@/hooks/use-is-mobile"

const MAX_OFFSET = 18

interface EyeIconProps {
  saccade?: boolean
  blink?: boolean
}

function EyeIcon({ saccade = false, blink = false }: EyeIconProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [closed, setClosed] = useState(false)
  const isMobile = useIsMobile()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const saccadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saccadeAnimation = useRef<ReturnType<
    typeof requestAnimationFrame
  > | null>(null)
  const targetOffset = useRef({ x: 0, y: 0 })
  const currentOffset = useRef({ x: 0, y: 0 })
  const isMouseActive = useRef(false)
  const mouseInactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const isHovering = useRef(false)

  // Mouse tracking (rAF-throttled to reduce main thread work)
  const rafId = useRef<number | null>(null)
  const latestMouseEvent = useRef<MouseEvent | null>(null)

  useEffect(() => {
    const processMove = () => {
      rafId.current = null
      const e = latestMouseEvent.current
      const rect = svgRef.current?.getBoundingClientRect()
      if (!e || !rect) return

      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 0) {
        const clampedDistance = Math.min(distance, MAX_OFFSET * 10)
        const scale = (clampedDistance / (MAX_OFFSET * 10)) * MAX_OFFSET
        setOffset({ x: (dx / distance) * scale, y: (dy / distance) * scale })
      } else {
        setOffset({ x: 0, y: 0 })
      }
    }

    const handler = (e: MouseEvent) => {
      latestMouseEvent.current = e
      isMouseActive.current = true

      if (mouseInactivityTimer.current)
        clearTimeout(mouseInactivityTimer.current)
      mouseInactivityTimer.current = setTimeout(() => {
        isMouseActive.current = false
      }, 2000)

      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(processMove)
      }
    }

    window.addEventListener("mousemove", handler, { passive: true })
    return () => {
      window.removeEventListener("mousemove", handler)
      if (rafId.current) cancelAnimationFrame(rafId.current)
      if (mouseInactivityTimer.current)
        clearTimeout(mouseInactivityTimer.current)
    }
  }, [])

  // Saccade (idle random eye movement)
  useEffect(() => {
    if (!saccade || !isMobile) return

    const animateToTarget = () => {
      const lerp = 0.12
      currentOffset.current = {
        x:
          currentOffset.current.x +
          (targetOffset.current.x - currentOffset.current.x) * lerp,
        y:
          currentOffset.current.y +
          (targetOffset.current.y - currentOffset.current.y) * lerp,
      }

      setOffset({ ...currentOffset.current })

      const dx = targetOffset.current.x - currentOffset.current.x
      const dy = targetOffset.current.y - currentOffset.current.y
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        saccadeAnimation.current = requestAnimationFrame(animateToTarget)
      }
    }

    const pickNewTarget = () => {
      const angle = Math.random() * Math.PI * 2
      const radius = (0.4 + Math.random() * 0.6) * MAX_OFFSET
      targetOffset.current = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
      saccadeAnimation.current = requestAnimationFrame(animateToTarget)
    }

    const scheduleSaccade = () => {
      const delay = 800 + Math.random() * 1000
      saccadeTimer.current = setTimeout(() => {
        if (!isMouseActive.current) {
          pickNewTarget()
        }
        scheduleSaccade()
      }, delay)
    }

    scheduleSaccade()

    return () => {
      if (saccadeTimer.current) clearTimeout(saccadeTimer.current)
      if (saccadeAnimation.current)
        cancelAnimationFrame(saccadeAnimation.current)
    }
  }, [saccade, isMobile])

  // Periodic blink (both desktop and mobile)
  useEffect(() => {
    if (!blink) return

    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 4000
      const timer = setTimeout(() => {
        if (!isHovering.current) {
          setClosed(true)
          setTimeout(() => setClosed(false), 150)
        }
        scheduleBlink()
      }, delay)
      return timer
    }

    const timer = scheduleBlink()
    return () => clearTimeout(timer)
  }, [blink])

  // Hover to close on desktop, touch to blink on mobile
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = useCallback(() => {
    if (!blink || !isMobile) return
    setClosed(true)
    if (blinkTimer.current) clearTimeout(blinkTimer.current)
    blinkTimer.current = setTimeout(() => setClosed(false), 150)
  }, [blink, isMobile])

  const handleMouseEnter = useCallback(() => {
    if (!blink || isMobile) return
    isHovering.current = true
    setClosed(true)
  }, [blink, isMobile])

  const handleMouseLeave = useCallback(() => {
    if (!blink || isMobile) return
    isHovering.current = false
    setClosed(false)
  }, [blink, isMobile])

  return (
    <span
      className="align-center hit-area-4 hit-area inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      style={blink ? { cursor: "pointer" } : undefined}
    >
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 160 160"
        className="inline-block h-[1em] w-[1em]"
        aria-hidden="true"
      >
        <path
          d="M160,80c-15.98,27.59-45.82,46.17-80.01,46.17S15.98,107.59,0,80c15.98-27.61,45.82-46.17,79.99-46.17s64.03,18.56,80.01,46.17Z"
          fill="currentColor"
          style={{
            transition: "transform 150ms ease-in-out",
            transform: closed ? "scaleY(0.1)" : "scaleY(1)",
            transformOrigin: "center",
          }}
        />
        {!closed && (
          <circle
            cx={80 + offset.x}
            cy={80 + offset.y}
            r="23.09"
            className="fill-background"
          />
        )}
      </svg>
    </span>
  )
}

export { EyeIcon }
