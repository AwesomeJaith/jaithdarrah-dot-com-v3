"use client"

import { motion } from "motion/react"
import { CloseButton } from "./close-button"
import { springTransition } from "./constants"

export function HelpPage({ handleCardClose }: { handleCardClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <motion.h2
          layoutId="notch-title"
          layout="position"
          className="text-sm font-medium"
          transition={springTransition}
        >
          How it works
        </motion.h2>
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
