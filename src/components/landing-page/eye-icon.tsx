"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useIsMobile } from "@/hooks/use-is-mobile"

const MAX_OFFSET = 18

interface EyeIconProps {
  gyroscope?: boolean
  saccade?: boolean
  blink?: boolean
}

function EyeIcon({ gyroscope = false, saccade = false, blink = false }: EyeIconProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [closed, setClosed] = useState(false)
  const isMobile = useIsMobile()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const saccadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saccadeAnimation = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const targetOffset = useRef({ x: 0, y: 0 })
  const currentOffset = useRef({ x: 0, y: 0 })
  const isMouseActive = useRef(false)
  const isGyroActive = useRef(false)
  const mouseInactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mouse tracking
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return

      isMouseActive.current = true

      if (mouseInactivityTimer.current) clearTimeout(mouseInactivityTimer.current)
      mouseInactivityTimer.current = setTimeout(() => {
        isMouseActive.current = false
      }, 2000)

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
    window.addEventListener("mousemove", handler)
    return () => {
      window.removeEventListener("mousemove", handler)
      if (mouseInactivityTimer.current) clearTimeout(mouseInactivityTimer.current)
    }
  }, [])

  // Gyroscope tracking
  useEffect(() => {
    if (!gyroscope) return

    const handler = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0 // left/right tilt (-90 to 90)
      const beta = e.beta ?? 0 // front/back tilt (-180 to 180)

      if (Math.abs(gamma) > 1 || Math.abs(beta) > 1) {
        isGyroActive.current = true
      }

      const x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, (gamma / 45) * MAX_OFFSET))
      const y = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, ((beta - 45) / 45) * MAX_OFFSET))

      if (!isMouseActive.current) {
        setOffset({ x, y })
      }
    }

    // iOS 13+ requires permission
    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof doe.requestPermission === "function") {
      doe.requestPermission().then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", handler)
        }
      })
    } else {
      window.addEventListener("deviceorientation", handler)
    }

    return () => {
      window.removeEventListener("deviceorientation", handler)
    }
  }, [gyroscope])

  // Saccade (idle random eye movement)
  useEffect(() => {
    if (!saccade) return

    const animateToTarget = () => {
      const lerp = 0.12
      currentOffset.current = {
        x: currentOffset.current.x + (targetOffset.current.x - currentOffset.current.x) * lerp,
        y: currentOffset.current.y + (targetOffset.current.y - currentOffset.current.y) * lerp,
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
      const delay = 800 + Math.random() * 2000
      saccadeTimer.current = setTimeout(() => {
        if (!isMouseActive.current && !isGyroActive.current) {
          pickNewTarget()
        }
        scheduleSaccade()
      }, delay)
    }

    scheduleSaccade()

    return () => {
      if (saccadeTimer.current) clearTimeout(saccadeTimer.current)
      if (saccadeAnimation.current) cancelAnimationFrame(saccadeAnimation.current)
    }
  }, [saccade])

  // Blink: touch to blink on mobile, hover to close on desktop
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = useCallback(() => {
    if (!blink || !isMobile) return
    setClosed(true)
    if (blinkTimer.current) clearTimeout(blinkTimer.current)
    blinkTimer.current = setTimeout(() => setClosed(false), 150)
  }, [blink, isMobile])

  const handleMouseEnter = useCallback(() => {
    if (!blink || isMobile) return
    setClosed(true)
  }, [blink, isMobile])

  const handleMouseLeave = useCallback(() => {
    if (!blink || isMobile) return
    setClosed(false)
  }, [blink, isMobile])

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      className="align-center inline-block h-[1em] w-[1em]"
      aria-hidden="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      style={blink ? { cursor: "pointer" } : undefined}
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
  )
}

export { EyeIcon }
