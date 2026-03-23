"use client"

import { useCallback, useEffect, useState } from "react"

const MAX_OFFSET = 18

function EyeIcon() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener("mousemove", handler)
    return () => window.removeEventListener("mousemove", handler)
  }, [])

  const svgRef = useCallback((node: SVGSVGElement | null) => {
    if (node) setRect(node.getBoundingClientRect())
  }, [])

  let offsetX = 0
  let offsetY = 0

  if (rect) {
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = mouse.x - centerX
    const dy = mouse.y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 0) {
      const clampedDistance = Math.min(distance, MAX_OFFSET * 10)
      const scale = (clampedDistance / (MAX_OFFSET * 10)) * MAX_OFFSET
      offsetX = (dx / distance) * scale
      offsetY = (dy / distance) * scale
    }
  }

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      className="align-center inline-block h-[1em] w-[1em]"
      aria-hidden="true"
    >
      <path
        d="M160,80c-15.98,27.59-45.82,46.17-80.01,46.17S15.98,107.59,0,80c15.98-27.61,45.82-46.17,79.99-46.17s64.03,18.56,80.01,46.17Z"
        fill="currentColor"
      />
      <circle
        cx={80 + offsetX}
        cy={80 + offsetY}
        r="23.09"
        className="fill-background"
      />
    </svg>
  )
}

export { EyeIcon }
