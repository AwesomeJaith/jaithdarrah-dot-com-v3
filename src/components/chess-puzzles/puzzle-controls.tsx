"use client"

import { cn } from "@/lib/utils"

export type PuzzleStatus = "playing" | "correct" | "wrong" | "solved"

type PuzzleControlsProps = {
  status: PuzzleStatus
  rating: number
  themes: string[]
  onRetry: () => void
}

const statusConfig: Record<PuzzleStatus, { text: string; className: string }> =
  {
    playing: {
      text: "Your turn — find the best move",
      className: "text-foreground",
    },
    correct: { text: "Correct! Keep going...", className: "text-green-500" },
    wrong: { text: "Wrong — try again", className: "text-red-500" },
    solved: { text: "Puzzle solved!", className: "text-green-500 font-bold" },
  }

export function PuzzleControls({
  status,
  rating,
  themes,
  onRetry,
}: PuzzleControlsProps) {
  const config = statusConfig[status]

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("text-sm", config.className)}>{config.text}</div>

      <div className="flex items-center gap-2">
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">
          Rating: {rating}
        </span>
        {themes.slice(0, 3).map((theme) => (
          <span
            key={theme}
            className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
          >
            {theme}
          </span>
        ))}
      </div>

      <button
        onClick={onRetry}
        className="w-fit rounded-md bg-muted px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
      >
        Retry
      </button>
    </div>
  )
}
