"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"
import { motion, useInView, UseInViewOptions } from "motion/react"

const CAT_PATH =
  "M158.38,81.66c-3.28-14.48-11.4-27.13-22.57-36.16-11.16-9.03-25.37-14.43-40.84-14.43s-29.67,5.4-40.83,14.43c-3,2.42-5.78,5.09-8.29,8-.31.35-.88.15-.88-.32v-7.68s-.23,0-.23,0l-18.38,11.93c-2.35,1.53-5.39,1.53-7.74,0L.24,45.51h-.24v42.82c0,3.15,2.55,5.7,5.7,5.7h137.44c1.72,0,3.13,1.41,3.13,3.12v1.21c0,24.61-17.33,45.18-40.47,50.15-2.41.52-4.12,2.68-4.12,5.15v1.35c0,3.11,2.83,5.5,5.88,4.91,29.89-5.86,52.44-32.19,52.44-63.8,0-4.97-.56-9.8-1.62-14.44ZM15.74,84.85c-5.75,3.08-11.51-2.71-8.39-8.42.43-.78,1.08-1.43,1.86-1.86,5.71-3.12,11.5,2.64,8.42,8.39-.43.79-1.09,1.46-1.88,1.88ZM33.79,85.4c-1.11.31-2.11.39-2.99.23-2.88-.43-5.08-2.92-5.08-5.92,0-3.33,2.69-6.01,6.01-6.01.72,0,1.43.12,2.06.37,3.28,1.2,5.23,5.22,2.94,9.13-.64,1.1-1.73,1.86-2.95,2.21Z"

// Encoded SVG for use as a CSS mask-image
const CAT_MASK_SVG = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><path fill="white" d="${CAT_PATH}"/></svg>`
)}")`

interface CatLogoProps {
  /** Whether to apply shimmer effect */
  shimmer?: boolean
  /** Animation duration in seconds */
  duration?: number
  /** Delay before starting animation */
  delay?: number
  /** Whether to repeat the animation */
  repeat?: boolean
  /** Pause duration between repeats in seconds */
  repeatDelay?: number
  /** Whether to start animation when component enters viewport */
  startOnView?: boolean
  /** Whether to animate only once */
  once?: boolean
  /** Margin for in-view detection (rootMargin) */
  inViewMargin?: UseInViewOptions["margin"]
  /** Custom className */
  className?: string
}

function CatSvg({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      data-name="cat"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      className={cn("h-12 w-12", className)}
      {...props}
    >
      <path d={CAT_PATH} />
    </svg>
  )
}

export function CatLogo({
  shimmer = false,
  duration = 2,
  delay = 0,
  repeat = true,
  repeatDelay = 0,
  startOnView = true,
  once = false,
  inViewMargin,
  className,
}: CatLogoProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: inViewMargin })

  const shouldAnimate = shimmer && (!startOnView || isInView)

  if (!shimmer) {
    return <CatSvg className={className} />
  }

  return (
    <motion.div
      ref={ref}
      className={cn(
        "h-12 w-12",
        "bg-size-[250%_100%] [background-repeat:no-repeat,padding-box]",
        "[--base-color:var(--muted-foreground)] [--shimmer-color:var(--foreground)]",
        "[--spread:20px]",
        "[--shimmer-bg:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--shimmer-color),transparent_calc(50%+var(--spread)))]",
        className
      )}
      style={{
        backgroundImage:
          "var(--shimmer-bg), linear-gradient(var(--base-color), var(--base-color))",
        maskImage: CAT_MASK_SVG,
        WebkitMaskImage: CAT_MASK_SVG,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
      initial={{ backgroundPosition: "100% center" }}
      animate={shouldAnimate ? { backgroundPosition: "0% center" } : {}}
      transition={{
        backgroundPosition: {
          repeat: repeat ? Infinity : 0,
          duration,
          delay,
          repeatDelay,
          ease: "linear",
        },
      }}
    />
  )
}
