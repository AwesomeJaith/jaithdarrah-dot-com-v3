"use client"

import { CloseButton } from "./close-button"

export function HelpPage({ handleCardClose }: { handleCardClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">How it works</h2>
        <CloseButton onClick={handleCardClose} />
      </div>

      <div className="flex flex-1 flex-col gap-2 rounded-lg bg-muted p-3">
        <div className="flex h-16 items-center justify-center rounded-md bg-background/50 text-muted-foreground">
          <span className="text-xs">Tutorial video coming soon</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload an image, click anywhere on the canvas to place it, and scroll
          to rotate before placing.
        </p>
      </div>
    </>
  )
}
