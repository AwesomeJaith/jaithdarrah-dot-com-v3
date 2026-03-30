import { useEffect, useRef, useState } from "react"

/**
 * Smoothly interpolates toward a target progress value using rAF.
 * Caps at 95% until `done` is true, then eases to 100%.
 */
export function useInterpolatedProgress(target: number, done: boolean) {
  const [value, setValue] = useState(0)
  const current = useRef(0)

  const effectiveTarget = done ? 1 : Math.min(target, 0.95)

  useEffect(() => {
    let raf: number

    const animate = () => {
      const diff = effectiveTarget - current.current
      if (Math.abs(diff) < 0.001) {
        current.current = effectiveTarget
        setValue(effectiveTarget)
        return
      }
      // Faster factor (0.12) once done so the final 95%→100% feels snappy.
      const factor = done ? 0.12 : 0.05
      current.current += diff * factor
      setValue(current.current)
      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [effectiveTarget, done])

  return value
}
