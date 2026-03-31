"use client"

import { motion } from "motion/react"

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      layoutId="notch-close"
      layout="position"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground"
      aria-label="Close"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </motion.button>
  )
}
