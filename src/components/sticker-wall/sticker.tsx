"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import type { Sticker as StickerType } from "@/lib/stickers"
import { StickerPopup } from "./sticker-popup"

type StickerProps = {
  sticker: StickerType
  onInspect?: (sticker: StickerType) => void
  disabled?: boolean
}

export function Sticker({ sticker, onInspect, disabled }: StickerProps) {
  const [hovered, setHovered] = useState(false)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDownPos.current || !onInspect) return
    const dx = e.clientX - pointerDownPos.current.x
    const dy = e.clientY - pointerDownPos.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    // Only treat as a click if the pointer barely moved (not a pan)
    if (dist < 5) {
      setHovered(false)
      onInspect(sticker)
    }
    pointerDownPos.current = null
  }

  return (
    <div
      className={`group absolute animate-pop-in select-none${disabled ? " pointer-events-none" : ""}`}
      onDragStart={(e) => e.preventDefault()}
      style={{
        left: sticker.x,
        top: sticker.y,
        width: sticker.width,
        height: sticker.height,
        transform: `rotate(${sticker.rotation}deg)`,
        zIndex: hovered ? 2147483647 : undefined,
        cursor: onInspect ? "pointer" : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      tabIndex={0}
      role="button"
      aria-label={`Sticker by ${sticker.username}${sticker.message ? `: ${sticker.message}` : ""}${onInspect ? ". Click to inspect." : ""}`}
    >
      {hovered && <StickerPopup sticker={sticker} />}
      <Image
        src={sticker.image_url}
        alt={`Sticker by ${sticker.username}`}
        width={sticker.width}
        height={sticker.height}
        className="pointer-events-none h-full w-full object-contain select-none"
        draggable={false}
        placeholder={sticker.blur_data_url ? "blur" : "empty"}
        blurDataURL={sticker.blur_data_url ?? undefined}
      />
    </div>
  )
}
