import type { Ref } from "react"
import { cn } from "@/lib/utils"

type CanvasBarProps = {
  children: React.ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
}

export function CanvasBar({ children, className, ref }: CanvasBarProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md",
        className
      )}
    >
      {children}
    </div>
  )
}
