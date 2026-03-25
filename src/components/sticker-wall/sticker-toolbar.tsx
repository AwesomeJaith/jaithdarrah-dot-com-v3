"use client"

import { FaPlus, FaMinus, FaCompass } from "react-icons/fa6"
import { Button } from "@/components/ui/button"

type StickerToolbarProps = {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onPlaceSticker: () => void
  isPlacing: boolean
}

// TODO: Convert into notch?
export function StickerToolbar({
  onZoomIn,
  onZoomOut,
  onResetView,
  onPlaceSticker,
  isPlacing,
}: StickerToolbarProps) {
  return (
    <div className="absolute right-4 bottom-4 z-40 flex flex-col gap-2">
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-popover p-1 shadow-md">
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
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onResetView}
          aria-label="Reset view"
        >
          <FaCompass />
        </Button>
      </div>
      <Button
        variant={isPlacing ? "outline" : "default"}
        size="lg"
        onClick={onPlaceSticker}
        className="shadow-md"
      >
        {isPlacing ? "Cancel" : "Place a sticker"}
      </Button>
    </div>
  )
}
