import { ActivityCalendar } from "./activity-calendar"

type GitHubContribution = {
  date: string
  count: number
  level: number
}

type GitHubResponse = {
  total: Record<string, number>
  contributions: GitHubContribution[]
}

async function fetchGitHubContributions(): Promise<{
  countsByDay: (number | null)[]
  lastDay: number
}> {
  const res = await fetch(
    "https://github-contributions-api.jogruber.de/v4/AwesomeJaith",
    { next: { revalidate: 3600 } }
  )
  const data: GitHubResponse = await res.json()

  const now = new Date()
  const lastDay = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  )

  // Build a map of date string -> count from the API
  const countMap = new Map<string, number>()
  for (const contribution of data.contributions) {
    countMap.set(contribution.date, contribution.count)
  }

  // Build countsByDay array covering the last 366 days up to today
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

async function GitHubStats() {
  const data = await fetchGitHubContributions()

  return (
    <div className="flex flex-col gap-2">
      <h2>GitHub</h2>
      <ActivityCalendar
        data={data}
        label="GitHub"
        activityType="commits"
        color="#56d364"
      />
    </div>
  )
}

export { GitHubStats }
