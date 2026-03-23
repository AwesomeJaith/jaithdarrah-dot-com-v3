import { cacheLife } from "next/cache"
import { ActivityCalendar } from "./activity-calendar"

type MonkeyTypeResponse = {
  message: string
  data: {
    testsByDays: (number | null)[]
    lastDay: number
  }
}

async function fetchMonkeyTypeActivity(): Promise<{
  countsByDay: (number | null)[]
  lastDay: number
}> {
  "use cache"
  cacheLife("hours")
  const apeKey = process.env.APE_KEY
  if (!apeKey) throw new Error("APE_KEY not configured")

  const res = await fetch(
    "https://api.monkeytype.com/users/currentTestActivity",
    {
      headers: {
        Authorization: `ApeKey ${apeKey}`,
      },
      next: { revalidate: 3600 },
    }
  )

  if (!res.ok) throw new Error(`MonkeyType API error: ${res.status}`)

  const { data }: MonkeyTypeResponse = await res.json()

  return {
    countsByDay: data.testsByDays,
    lastDay: data.lastDay,
  }
}

async function MonkeyTypeStats() {
  const data = await fetchMonkeyTypeActivity()

  return (
    <div className="flex flex-col gap-2">
      <h2>MonkeyType</h2>
      <ActivityCalendar
        data={data}
        label="MonkeyType"
        activityType="tests"
        color="#5a65ea"
      />
    </div>
  )
}

export { MonkeyTypeStats }
