"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import type { Sticker as StickerType } from "@/lib/stickers"
import { StickerPopup } from "./sticker-popup"

type StickerProps = {
  sticker: StickerType
  onInspect?: (sticker: StickerType) => void
  disabled?: boolean
}

/**
 * Decode a base64 data URL image into an alpha map (Uint8Array of alpha values).
 * Returns the map and its dimensions.
 */
function decodeAlphaMap(
  dataUrl: string
): Promise<{ alpha: Uint8Array; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new globalThis.Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      const { data } = ctx.getImageData(0, 0, img.width, img.height)
      const alpha = new Uint8Array(img.width * img.height)
      for (let i = 0; i < alpha.length; i++) {
        alpha[i] = data[i * 4 + 3]
      }
      resolve({ alpha, width: img.width, height: img.height })
    }
    img.src = dataUrl
  })
}

/** Check if a point (relative to the sticker element) hits an opaque pixel. */
function isOpaqueAt(
  x: number,
  y: number,
  elWidth: number,
  elHeight: number,
  alphaMap: { alpha: Uint8Array; width: number; height: number }
): boolean {
  const mapX = Math.floor((x / elWidth) * alphaMap.width)
  const mapY = Math.floor((y / elHeight) * alphaMap.height)
  if (mapX < 0 || mapX >= alphaMap.width || mapY < 0 || mapY >= alphaMap.height)
    return false
  return alphaMap.alpha[mapY * alphaMap.width + mapX] > 10
}

export function Sticker({ sticker, onInspect, disabled }: StickerProps) {
  const [hovered, setHovered] = useState(false)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const divRef = useRef<HTMLDivElement>(null)
  const alphaMapRef = useRef<{
    alpha: Uint8Array
    width: number
    height: number
  } | null>(null)

  // Decode the blur_data_url into an alpha map on mount
  useEffect(() => {
    if (!sticker.blur_data_url) return
    decodeAlphaMap(sticker.blur_data_url).then((map) => {
      alphaMapRef.current = map
    })
  }, [sticker.blur_data_url])

  const hitsOpaque = (e: React.PointerEvent | React.MouseEvent) => {
    if (!alphaMapRef.current || !divRef.current) return true
    const rect = divRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    return isOpaqueAt(x, y, rect.width, rect.height, alphaMapRef.current)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!hitsOpaque(e)) return
    pointerDownPos.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDownPos.current || !onInspect) return
    if (!hitsOpaque(e)) {
      pointerDownPos.current = null
      return
    }
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

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (hitsOpaque(e)) setHovered(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const opaque = hitsOpaque(e)
    if (opaque && !hovered) setHovered(true)
    else if (!opaque && hovered) setHovered(false)
  }

  return (
    <div
      ref={divRef}
      className={`group absolute animate-pop-in select-none${disabled ? "pointer-events-none" : ""}`}
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
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
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
