"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { ActivityCalendarData } from "@/lib/activity-calendar"

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

type Props = {
  data: { countsByDay: (number | null)[]; lastDay: number }
  label?: string
  activityType?: string
  color?: string
}

type Tooltip = { x: number; y: number; text: string }

function getLevelColors(color: string): Record<string, string> {
  return {
    filler: "transparent",
    "0": "var(--background)",
    "1": `color-mix(in srgb, ${color} 20%, var(--muted))`,
    "2": `color-mix(in srgb, ${color} 50%, var(--muted))`,
    "3": `color-mix(in srgb, ${color} 75%, var(--muted))`,
    "4": color,
  }
}

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]

function ActivityCalendar({
  data,
  label,
  activityType = "activities",
  color = "var(--primary)",
}: Props) {
  const levelColors = getLevelColors(color)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  useEffect(() => {
    if (!tooltip) return

    const dismiss = () => setTooltip(null)
    const options = { passive: true, capture: true }

    window.addEventListener("scroll", dismiss, options)
    return () => window.removeEventListener("scroll", dismiss, options)
  }, [tooltip])

  const weeks = useSyncExternalStore(subscribeToBreakpoints, getWeeks, () => 52)

  const calendar = useMemo(
    () =>
      new ActivityCalendarData(
        data.countsByDay,
        new Date(data.lastDay),
        0,
        false,
        weeks
      ),
    [data, weeks]
  )

  const days = calendar.getDays()
  const months = calendar.getMonths()
  const total = calendar.getTotal()
  const gridCols = Math.ceil(days.length / 7)

  // Show label on alternating rows (mon, wed, fri) — matches MonkeyType
  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    i % 2 !== 0 ? DAY_NAMES[i % 7] : undefined
  )

  return (
    <div className="rounded-lg bg-muted p-4 text-sm">
      {/* Top row: total + legend */}
      <div className="mb-3 flex items-start justify-between">
        <span className="text-muted-foreground">
          {total} {label ? `${label} ${activityType}` : activityType}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="mr-1 text-xs">less</span>
          {["0", "1", "2", "3", "4"].map((level) => (
            <div
              key={level}
              style={{
                width: "0.9em",
                height: "0.9em",
                borderRadius: "0.25em",
                backgroundColor: levelColors[level],
              }}
            />
          ))}
          <span className="ml-1 text-xs">more</span>
        </div>
      </div>

      {/* Wrapper grid matching MonkeyType's grid-template-areas structure */}
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
          {dayLabels.map((name, i) => (
            <div key={i}>
              <div style={{ height: 0, display: "flex", alignItems: "center" }}>
                {name ? <span className="pr-1">{name.slice(0, 3)}</span> : null}
              </div>
            </div>
          ))}
        </div>

        {/* Activity grid (event delegation for tooltips) */}
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
          onMouseOver={(e) => {
            const label = (e.target as HTMLElement).dataset.label
            if (label) setTooltip({ x: e.clientX, y: e.clientY, text: label })
          }}
          onMouseMove={(e) => {
            const label = (e.target as HTMLElement).dataset.label
            if (label) setTooltip({ x: e.clientX, y: e.clientY, text: label })
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          {days.map((day, i) => (
            <div
              key={i}
              data-label={day.label || undefined}
              style={{
                width: "100%",
                aspectRatio: "1",
                placeSelf: "center",
                borderRadius: "0.25em",
                backgroundColor: levelColors[day.level] ?? levelColors["0"],
                cursor: day.level !== "filler" ? "pointer" : undefined,
                outline:
                  tooltip?.text === day.label && day.level !== "filler"
                    ? "2px solid var(--foreground)"
                    : undefined,
              }}
            />
          ))}
        </div>

        {/* Empty cell — keeps months in column 2 */}
        <div style={{ gridArea: "empty" }} />

        {/* Month labels */}
        <div
          style={{
            gridArea: "month",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          }}
        >
          {months.map((month, i) => (
            <div
              key={i}
              style={{ gridColumn: `span ${month.weeks}` }}
              className="text-center"
            >
              {month.text}
            </div>
          ))}
        </div>
      </div>

      {/* Single floating tooltip — pinned to cursor, clamped to viewport via CSS */}
      {tooltip && (
        <div
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-2"
          style={{ top: tooltip.y - 40 }}
        >
          <div
            className="rounded bg-foreground px-2 py-1 text-xs text-background"
            style={{
              minWidth: "8rem",
              textAlign: "center",
              marginLeft: `calc(${tooltip.x}px - 50%)`,
            }}
          >
            {tooltip.text}
          </div>
        </div>
      )}
    </div>
  )
}

export { ActivityCalendar }
