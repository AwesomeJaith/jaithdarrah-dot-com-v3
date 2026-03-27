"use client"

import type { ReactNode } from "react"
import { FaPlus, FaMinus, FaCompass } from "react-icons/fa6"
import { Button } from "@/components/ui/button"

type StickerToolbarProps = {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  minimap?: ReactNode
}

export function StickerToolbar({
  onZoomIn,
  onZoomOut,
  onResetView,
  minimap,
}: StickerToolbarProps) {
  return (
    <div className="absolute right-3 bottom-3 z-40 flex flex-col gap-1.5">
      {minimap}
      <div className="flex gap-1 rounded-lg border border-border bg-popover p-1 shadow-md">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="flex-1"
        >
          <FaPlus />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onResetView}
          aria-label="Reset view"
          className="flex-1"
        >
          <FaCompass />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="flex-1"
        >
          <FaMinus />
        </Button>
      </div>
    </div>
  )
}
