"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { CloseButton } from "./close-button"

type PlacePageProps = {
  handleCardClose: () => void
  stickerPreviewUrl: string | null
  transitionToMessage: () => void
}

export function PlacePage({
  handleCardClose,
  stickerPreviewUrl,
  transitionToMessage,
}: PlacePageProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Ready!</h2>
        <CloseButton onClick={handleCardClose} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-lg bg-muted p-3">
        {stickerPreviewUrl && (
          <Image
            src={stickerPreviewUrl}
            height={100}
            width={100}
            alt="Your sticker"
            className="min-h-0 max-w-full flex-1 object-contain"
            style={{ height: "auto" }}
          />
        )}
        <Button size="lg" className="w-full" onClick={transitionToMessage}>
          Next
        </Button>
      </div>
    </>
  )
}
