"use client"

import type { Ref } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { springTransition } from "./notch-cards/constants"

type CanvasBarProps = {
  children: React.ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
}

export function CanvasBar({ children, className, ref }: CanvasBarProps) {
  return (
    <motion.div
      ref={ref}
      layout
      transition={springTransition}
      className={cn(
        "flex items-center gap-1 overflow-hidden rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md",
        className
      )}
    >
      {children}
    </motion.div>
  )
}
