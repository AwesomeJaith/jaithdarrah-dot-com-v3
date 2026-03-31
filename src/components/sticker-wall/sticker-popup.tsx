"use client"

import type { Sticker } from "@/lib/stickers"

// TODO: Improve appearance of sticker popup
export function StickerPopup({ sticker }: { sticker: Sticker }) {
  // Counter-rotate so the popup text stays upright regardless of sticker rotation.
  // Normalize to [-180, 180] then negate.
  const rot = (((sticker.rotation % 360) + 540) % 360) - 180
  return (
    <div
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 animate-in duration-150 zoom-in-95 fade-in"
      style={{ rotate: `${-rot}deg` }}
    >
      <div className="rounded-sm border border-border bg-popover px-3 py-2 text-sm whitespace-nowrap text-popover-foreground shadow-md">
        <p className="font-medium">
          Placed by {sticker.username} on{" "}
          {new Date(sticker.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        {sticker.message && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sticker.message}
          </p>
        )}
      </div>
    </div>
  )
}
