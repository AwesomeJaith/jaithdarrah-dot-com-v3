"use client"

import { GitHubStats } from "./github-stats"
import { ChessStats } from "./chess-stats"
import { ClashRoyaleStats } from "./clash-royale-stats"
import { MonkeyTypeStats } from "./monkey-type-stats"

function StatsSection() {
  return (
    <div className="w-full max-w-3xl">
      <h1 className="pb-4">Stats</h1>
      <div className="flex flex-col gap-8">
        <GitHubStats />
        <ChessStats />
        <ClashRoyaleStats />
        <MonkeyTypeStats />
      </div>
    </div>
  )
}

export { StatsSection }
