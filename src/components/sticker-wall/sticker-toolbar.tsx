"use client"

import type { ReactNode, Ref } from "react"
import { FaPlus, FaMinus, FaCompass } from "react-icons/fa6"
import { Button } from "@/components/ui/button"
import { CanvasBar } from "./canvas-bar"

type StickerToolbarProps = {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  minimap?: ReactNode
  zoomRowRef?: Ref<HTMLDivElement>
  isCompact?: boolean
}

export function StickerToolbar({
  onZoomIn,
  onZoomOut,
  onResetView,
  minimap,
  zoomRowRef,
  isCompact,
}: StickerToolbarProps) {
  if (isCompact) {
    return (
      <div ref={zoomRowRef} className="flex flex-col gap-1">
        <CanvasBar>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onResetView}
            aria-label="Reset view"
          >
            <FaCompass />
          </Button>
        </CanvasBar>
        <CanvasBar className="flex-col">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onZoomIn}
            aria-label="Zoom in"
          >
            <FaPlus />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onZoomOut}
            aria-label="Zoom out"
          >
            <FaMinus />
          </Button>
        </CanvasBar>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {minimap}
      <div
        ref={zoomRowRef}
        className="flex gap-1 rounded-lg border border-sticker-border bg-sticker-panel p-1 shadow-md"
      >
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
