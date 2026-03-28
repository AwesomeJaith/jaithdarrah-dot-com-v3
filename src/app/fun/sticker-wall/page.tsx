import type { Metadata } from "next"
import { Suspense } from "react"
import { getStickersByViewport } from "@/lib/stickers"
import { StickerCanvas } from "@/components/sticker-wall/sticker-canvas"

export const metadata: Metadata = {
  title: "Sticker Wall",
  description:
    "An interactive sticker wall - upload an image, turn it into a sticker, and place it on the wall!",
}

async function StickerWallContent() {
  // Load stickers near origin for the initial viewport (~1920x1080 centered at 0,0)
  const stickers = await getStickersByViewport(-1000, -600, 1000, 600)
  // Serialize Turso row objects to plain objects for client component
  const plainStickers = stickers.map((s) => ({ ...s }))
  return <StickerCanvas initialStickers={plainStickers} />
}

export default function StickerWallPage() {
  return (
    <div className="flex w-full max-w-3xl flex-1 flex-col gap-4">
      <div>
        <h1>Sticker Wall</h1>
        <p className="text-sm text-muted-foreground">
          Upload an image, turn it into a sticker, add a message, and place it
          anywhere on the wall.
        </p>
      </div>
      <div className="relative min-h-125 flex-1">
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center rounded-xl border border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Loading sticker wall...
                </p>
              </div>
            }
          >
            <StickerWallContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
