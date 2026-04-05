"use client"

import { useCallback, useEffect, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import type { LichessPuzzle } from "@/lib/lichess"
import { uciToMove } from "@/lib/lichess"
import { MoveList } from "./move-list"
import { PuzzleControls, type PuzzleStatus } from "./puzzle-controls"

type Props = {
  puzzle: LichessPuzzle
}

export function ChessPuzzleBoard({ puzzle }: Props) {
  const [game, setGame] = useState<Chess>(() => new Chess())
  const [solutionIndex, setSolutionIndex] = useState(0)
  const [status, setStatus] = useState<PuzzleStatus>("playing")
  const [allMoves, setAllMoves] = useState<{ san: string; color: "w" | "b" }[]>(
    []
  )
  const [currentPly, setCurrentPly] = useState(0)
  const [puzzlePly, setPuzzlePly] = useState(0)
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white"
  )
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)

  const initPuzzle = useCallback(() => {
    const g = new Chess()
    const pgnMoves = puzzle.game.pgn.split(" ")

    // Replay the game up to initialPly
    for (let i = 0; i < puzzle.puzzle.initialPly; i++) {
      g.move(pgnMoves[i])
    }

    const history = g.history({ verbose: true })
    const moves = history.map((m) => ({ san: m.san, color: m.color }))

    // The player to move at puzzle start is the solver
    // solution[0] is the opponent's last move that creates the tactic
    // Actually: initialPly is the number of half-moves already played.
    // The side to move after initialPly is the one who plays solution[0].
    // In Lichess puzzles, solution[0] is played automatically (the "setup" move),
    // and the user needs to find solution[1].
    // The user's color is the one who plays solution[1].

    const sideToMove = g.turn() // 'w' or 'b' — this side plays solution[0]
    // User plays the opposite side of solution[0], i.e., the side that plays solution[1]
    const userColor = sideToMove === "w" ? "black" : "white"

    setGame(g)
    setAllMoves(moves)
    setCurrentPly(puzzle.puzzle.initialPly)
    setPuzzlePly(puzzle.puzzle.initialPly)
    setSolutionIndex(0)
    setStatus("playing")
    setBoardOrientation(userColor)
    setWaitingForOpponent(true)

    // Auto-play solution[0] (opponent's setup move) after a delay
    setTimeout(() => {
      const setupMove = uciToMove(puzzle.puzzle.solution[0])
      const result = g.move({
        from: setupMove.from,
        to: setupMove.to,
        promotion: setupMove.promotion,
      })
      if (result) {
        const newMoves = [...moves, { san: result.san, color: result.color }]
        setGame(new Chess(g.fen()))
        setAllMoves(newMoves)
        setCurrentPly(puzzle.puzzle.initialPly + 1)
        setSolutionIndex(1)
        setWaitingForOpponent(false)
      }
    }, 600)
  }, [puzzle])

  useEffect(() => {
    initPuzzle()
  }, [initPuzzle])

  const handlePieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
      piece,
    }: {
      piece: { isSparePiece: boolean; position: string; pieceType: string }
      sourceSquare: string
      targetSquare: string | null
    }) => {
      if (!targetSquare) return false
      if (status === "solved" || waitingForOpponent) return false
      if (solutionIndex >= puzzle.puzzle.solution.length) return false

      const expected = uciToMove(puzzle.puzzle.solution[solutionIndex])

      // Check for promotion
      let promotion = expected.promotion
      if (!promotion && piece.pieceType.toLowerCase() === "p") {
        const rank = targetSquare[1]
        if (rank === "8" || rank === "1") {
          promotion = "q" // default to queen
        }
      }

      // Check if this move matches the expected solution
      if (sourceSquare === expected.from && targetSquare === expected.to) {
        const gameCopy = new Chess(game.fen())
        const result = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: promotion,
        })

        if (!result) return false

        const newMoves = [...allMoves, { san: result.san, color: result.color }]
        const newPly = currentPly + 1
        const nextIndex = solutionIndex + 1

        setGame(gameCopy)
        setAllMoves(newMoves)
        setCurrentPly(newPly)
        setSolutionIndex(nextIndex)

        // Check if puzzle is complete
        if (nextIndex >= puzzle.puzzle.solution.length) {
          setStatus("solved")
          return true
        }

        // Auto-play opponent's response
        setStatus("correct")
        setWaitingForOpponent(true)

        setTimeout(() => {
          const opponentMove = uciToMove(puzzle.puzzle.solution[nextIndex])
          const opResult = gameCopy.move({
            from: opponentMove.from,
            to: opponentMove.to,
            promotion: opponentMove.promotion,
          })

          if (opResult) {
            setGame(new Chess(gameCopy.fen()))
            setAllMoves((prev) => [
              ...prev,
              { san: opResult.san, color: opResult.color },
            ])
            setCurrentPly((prev) => prev + 1)
            setSolutionIndex(nextIndex + 1)

            // Check if puzzle solved after opponent's move
            if (nextIndex + 1 >= puzzle.puzzle.solution.length) {
              setStatus("solved")
            } else {
              setStatus("playing")
            }
          }
          setWaitingForOpponent(false)
        }, 500)

        return true
      }

      // Wrong move
      setStatus("wrong")
      setTimeout(() => {
        setStatus((s) => (s === "wrong" ? "playing" : s))
      }, 1000)
      return false
    },
    [
      game,
      solutionIndex,
      status,
      puzzle,
      allMoves,
      currentPly,
      waitingForOpponent,
    ]
  )

  return (
    <div className="flex w-full flex-col gap-6 md:flex-row">
      <div className="w-full md:w-1/2">
        <Chessboard
          options={{
            position: game.fen(),
            onPieceDrop: handlePieceDrop,
            boardOrientation: boardOrientation,
            animationDurationInMs: 200,
          }}
        />
      </div>

      <div className="flex flex-col gap-4 md:w-1/2">
        <MoveList
          moves={allMoves}
          currentPly={currentPly}
          puzzlePly={puzzlePly}
        />
        <PuzzleControls
          status={status}
          rating={puzzle.puzzle.rating}
          themes={puzzle.puzzle.themes}
          onRetry={initPuzzle}
        />
      </div>
    </div>
  )
}
