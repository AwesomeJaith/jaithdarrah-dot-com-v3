import { Suspense } from "react"
import { GitHubStats } from "./github-stats"
import { ChessStats } from "./chess-stats"
import { ClashRoyaleStats } from "./clash-royale-stats"
import { MonkeyTypeStats } from "./monkey-type-stats"
import { StatsSkeleton } from "./stats-skeleton"

function StatsSection() {
  return (
    <div className="w-full max-w-3xl">
      <h1 className="pb-4">Stats</h1>
      <div className="flex flex-col gap-8">
        <Suspense fallback={<StatsSkeleton name="GitHub" />}>
          <GitHubStats />
        </Suspense>
        <Suspense fallback={<StatsSkeleton name="Chess" />}>
          <ChessStats />
        </Suspense>
        <Suspense fallback={<StatsSkeleton name="Clash Royale" />}>
          <ClashRoyaleStats />
        </Suspense>
        <Suspense fallback={<StatsSkeleton name="MonkeyType" />}>
          <MonkeyTypeStats />
        </Suspense>
      </div>
    </div>
  )
}

export { StatsSection }
