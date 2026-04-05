export type LichessPuzzle = {
  game: {
    id: string
    perf: { key: string; name: string }
    rated: boolean
    players: {
      name: string
      id: string
      color: "white" | "black"
      rating: number
    }[]
    pgn: string
    clock: string
  }
  puzzle: {
    id: string
    rating: number
    plays: number
    solution: string[]
    themes: string[]
    initialPly: number
  }
}

export async function fetchDailyPuzzle(): Promise<LichessPuzzle> {
  const res = await fetch("https://lichess.org/api/puzzle/daily", {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch daily puzzle: ${res.status}`)
  }

  return res.json()
}

export function uciToMove(uci: string): {
  from: string
  to: string
  promotion?: string
} {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    ...(uci.length === 5 ? { promotion: uci[4] } : {}),
  }
}
