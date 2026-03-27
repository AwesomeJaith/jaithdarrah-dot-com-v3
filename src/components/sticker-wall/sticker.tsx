"use client"

import Image from "next/image"
import { useState } from "react"
import type { Sticker as StickerType } from "@/lib/stickers"
import { StickerPopup } from "./sticker-popup"

export function Sticker({ sticker }: { sticker: StickerType }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group absolute animate-pop-in"
      style={{
        left: sticker.x,
        top: sticker.y,
        width: sticker.width,
        height: sticker.height,
        transform: `rotate(${sticker.rotation}deg)`,
        zIndex: hovered ? 2147483647 : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      role="button"
      aria-label={`Sticker by ${sticker.username}${sticker.message ? `: ${sticker.message}` : ""}`}
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
