"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

type MoveEntry = {
  san: string
  color: "w" | "b"
}

type MoveListProps = {
  moves: MoveEntry[]
  currentPly: number
  puzzlePly: number
}

export function MoveList({ moves, currentPly, puzzlePly }: MoveListProps) {
  const activeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [currentPly])

  // Group moves into pairs (white, black)
  const pairs: { moveNumber: number; white?: MoveEntry; black?: MoveEntry }[] =
    []
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]
    if (move.color === "w") {
      pairs.push({ moveNumber: Math.floor(i / 2) + 1, white: move })
    } else {
      if (pairs.length === 0 || pairs[pairs.length - 1].black) {
        pairs.push({ moveNumber: Math.floor(i / 2) + 1, black: move })
      } else {
        pairs[pairs.length - 1].black = move
      }
    }
  }

  return (
    <div className="flex max-h-64 flex-col overflow-y-auto rounded-lg bg-muted p-3 font-mono text-sm">
      {pairs.map((pair, pairIdx) => {
        const whiteIdx = pairIdx * 2
        const blackIdx = pairIdx * 2 + 1

        return (
          <div key={pairIdx} className="flex gap-2">
            <span className="w-8 shrink-0 text-right text-muted-foreground">
              {pair.moveNumber}.
            </span>
            {pair.white && (
              <span
                ref={whiteIdx === currentPly - 1 ? activeRef : undefined}
                className={cn(
                  "w-16 rounded px-1",
                  whiteIdx === currentPly - 1 && "bg-foreground/15 font-bold",
                  whiteIdx >= puzzlePly && "text-green-500"
                )}
              >
                {pair.white.san}
              </span>
            )}
            {!pair.white && <span className="w-16" />}
            {pair.black && (
              <span
                ref={blackIdx === currentPly - 1 ? activeRef : undefined}
                className={cn(
                  "w-16 rounded px-1",
                  blackIdx === currentPly - 1 && "bg-foreground/15 font-bold",
                  blackIdx >= puzzlePly && "text-green-500"
                )}
              >
                {pair.black.san}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
