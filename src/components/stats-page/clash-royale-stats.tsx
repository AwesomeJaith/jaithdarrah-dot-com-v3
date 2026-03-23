import { cacheLife } from "next/cache"
import { turso } from "@/lib/turso"
import { ActivityCalendar } from "./activity-calendar"

async function fetchClashRoyaleActivity(): Promise<{
  countsByDay: (number | null)[]
  lastDay: number
}> {
  "use cache"
  cacheLife("hours")
  const now = new Date()
  const lastDay = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  )

  // Fetch all daily records from the last 366 days
  const cutoff = new Date(lastDay.getTime() - 366 * 86400000)
  const cutoffKey = cutoff.toISOString().slice(0, 10)

  const result = await turso.execute({
    sql: "SELECT date, games FROM clash_royale_daily WHERE date >= ? ORDER BY date",
    args: [cutoffKey],
  })

  const countMap = new Map<string, number>()
  for (const row of result.rows) {
    countMap.set(row.date as string, Number(row.games))
  }

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

async function ClashRoyaleStats() {
  const data = await fetchClashRoyaleActivity()

  return (
    <div className="flex flex-col gap-2">
      <h2>Clash Royale</h2>
      <ActivityCalendar
        data={data}
        label="Clash Royale"
        activityType="games"
        color="#3490dc"
      />
    </div>
  )
}

export { ClashRoyaleStats }
