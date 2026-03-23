"use client"

import { useSyncExternalStore } from "react"
import { Loader2 } from "lucide-react"

const breakpoints = [
  { query: "(max-width: 640px)", weeks: 13 },
  { query: "(max-width: 768px)", weeks: 26 },
  { query: "(max-width: 1024px)", weeks: 39 },
] as const

function getWeeks() {
  for (const bp of breakpoints) {
    if (window.matchMedia(bp.query).matches) return bp.weeks
  }
  return 52
}

function subscribeToBreakpoints(callback: () => void) {
  const mqls = breakpoints.map((bp) => window.matchMedia(bp.query))
  mqls.forEach((mql) => mql.addEventListener("change", callback))
  return () =>
    mqls.forEach((mql) => mql.removeEventListener("change", callback))
}

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

function StatsSkeleton({ name }: { name: string }) {
  const weeks = useSyncExternalStore(subscribeToBreakpoints, getWeeks, () => 52)
  const gridCols = weeks + 1
  const totalCells = gridCols * 7

  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    i % 2 !== 0 ? DAY_NAMES[i % 7] : undefined
  )

  return (
    <div className="flex flex-col gap-2">
      <h2>{name}</h2>
      <div className="relative rounded-lg bg-muted p-4 text-sm">
        {/* Blurred content matching ActivityCalendar layout */}
        <div className="blur-sm">
          {/* Top row: total + legend */}
          <div className="mb-3 flex items-start justify-between">
            <span className="text-muted-foreground">--- {name} activities</span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="mr-1 text-xs">less</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted-foreground/20"
                  style={{
                    width: "0.9em",
                    height: "0.9em",
                    borderRadius: "0.25em",
                  }}
                />
              ))}
              <span className="ml-1 text-xs">more</span>
            </div>
          </div>

          {/* Grid matching ActivityCalendar structure */}
          <div
            className="text-xs text-muted-foreground"
            style={{
              display: "grid",
              gridTemplateColumns: "min-content minmax(0, 1fr)",
              gridTemplateAreas: '"day chart" "empty month"',
              gap: "0.4em 0.5em",
            }}
          >
            {/* Day labels */}
            <div
              style={{
                gridArea: "day",
                display: "grid",
                gridTemplateRows: "repeat(7, 1fr)",
              }}
            >
              {dayLabels.map((label, i) => (
                <div key={i}>
                  <div
                    style={{
                      height: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {label ? <span className="pr-1">{label}</span> : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Activity grid */}
            <div
              style={{
                gridArea: "chart",
                minWidth: 0,
                display: "grid",
                gridAutoFlow: "column",
                gridTemplateRows: "repeat(7, 1fr)",
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gap: "0.2em",
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => (
                <div
                  key={i}
                  className="bg-background"
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    placeSelf: "center",
                    borderRadius: "0.25em",
                  }}
                />
              ))}
            </div>

            {/* Empty cell */}
            <div style={{ gridArea: "empty" }} />

            {/* Month labels placeholder */}
            <div
              style={{
                gridArea: "month",
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              }}
            >
              {Array.from({ length: Math.ceil(weeks / 4) }).map((_, i) => (
                <div
                  key={i}
                  style={{ gridColumn: "span 4" }}
                  className="text-center"
                >
                  ---
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loader overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground animation-duration-[0.75s]" />
        </div>
      </div>
    </div>
  )
}

export { StatsSkeleton }
