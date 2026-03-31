"use client"

import { motion } from "motion/react"
import { Upload, Wand2, Pencil, Move, Check } from "lucide-react"
import { CloseButton } from "./close-button"
import { springTransition } from "./constants"

const steps = [
  { icon: Upload, text: "Upload an image." },
  { icon: Wand2, text: "Turn it into a sticker." },
  { icon: Pencil, text: "Add your name and message." },
  { icon: Move, text: "Place and rotate it on the canvas." },
  { icon: Check, text: "Reviewed and approved." },
]

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

      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        {steps.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 rounded-sm bg-muted px-2 py-1"
          >
            <Icon className="size-3.5 shrink-0" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </>
  )
}
