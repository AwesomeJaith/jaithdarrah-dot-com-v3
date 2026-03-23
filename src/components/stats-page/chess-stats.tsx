import { cacheLife } from "next/cache"
import { ActivityCalendar } from "./activity-calendar"

type ChessGame = {
  end_time: number
}

type ChessMonthlyResponse = {
  games: ChessGame[]
}

type ChessArchivesResponse = {
  archives: string[]
}

async function fetchChessContributions(): Promise<{
  countsByDay: (number | null)[]
  lastDay: number
}> {
  "use cache"
  cacheLife("hours")
  const now = new Date()
  const lastDay = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  )
  const cutoff = new Date(lastDay.getTime() - 366 * 86400000)

  // Get list of monthly archive URLs
  const archivesRes = await fetch(
    "https://api.chess.com/pub/player/awesomejaith/games/archives",
    { next: { revalidate: 3600 } }
  )
  const { archives }: ChessArchivesResponse = await archivesRes.json()

  // Filter to archives within our date range
  const relevantArchives = archives.filter((url) => {
    const match = url.match(/\/games\/(\d{4})\/(\d{2})$/)
    if (!match) return false
    const archiveDate = new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)
    )
    return (
      archiveDate >=
      new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth(), 1))
    )
  })

  // Fetch all relevant months in parallel
  // Current month revalidates hourly; past months are effectively immutable
  const currentMonth = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`
  const monthlyResults = await Promise.all(
    relevantArchives.map(async (url) => {
      const isCurrent = url.endsWith(currentMonth)
      const res = await fetch(url, {
        next: { revalidate: isCurrent ? 3600 : 86400 * 30 },
      })
      const data: ChessMonthlyResponse = await res.json()
      return data.games
    })
  )

  // Count games per day
  const countMap = new Map<string, number>()
  for (const games of monthlyResults) {
    for (const game of games) {
      const date = new Date(game.end_time * 1000)
      const key = date.toISOString().slice(0, 10)
      countMap.set(key, (countMap.get(key) ?? 0) + 1)
    }
  }

  // Build countsByDay array covering the last 366 days
  const totalDays = 366
  const countsByDay: (number | null)[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(lastDay.getTime() - i * 86400000)
    const key = date.toISOString().slice(0, 10)
    const count = countMap.get(key)
    countsByDay.push(count && count > 0 ? count : null)
  }

  return { countsByDay, lastDay: lastDay.getTime() }
}

async function ChessStats() {
  const data = await fetchChessContributions()

  return (
    <div className="flex flex-col gap-2">
      <h2>Chess</h2>
      <ActivityCalendar
        data={data}
        label="Chess"
        activityType="games"
        color="#bf811d"
      />
    </div>
  )
}

export { ChessStats }
