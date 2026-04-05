import type { Metadata } from "next"
import { Suspense } from "react"
import { fetchDailyPuzzle } from "@/lib/lichess"
import { ChessPuzzleBoard } from "@/components/chess-puzzles/chess-puzzle-board"

export const metadata: Metadata = {
  title: "Chess Puzzles",
  description: "Solve the daily chess puzzle from Lichess.",
}

async function PuzzleContent() {
  const puzzle = await fetchDailyPuzzle()
  return <ChessPuzzleBoard puzzle={puzzle} />
}

export default function ChessPuzzlesPage() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1>Chess Puzzles</h1>
        <p className="text-sm text-muted-foreground">
          Solve the daily puzzle from Lichess.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Loading puzzle...
          </div>
        }
      >
        <PuzzleContent />
      </Suspense>
    </div>
  )
}
