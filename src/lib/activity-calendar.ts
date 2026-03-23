import { UTCDateMini } from "@date-fns/utc/date/mini"
import {
  format,
  endOfMonth,
  addDays,
  differenceInDays,
  eachMonthOfInterval,
  endOfYear,
  startOfYear,
  differenceInWeeks,
  startOfMonth,
  subWeeks,
  Interval,
  toDate,
  previousDay,
  Day,
  nextDay,
} from "date-fns"

export type ActivityDay = {
  level: string
  label?: string
}

export type ActivityMonth = {
  text: string
  weeks: number
}

export class ActivityCalendarData {
  protected data: (number | null | undefined)[]
  protected startDay: Date
  protected endDay: Date
  protected isFullYear: boolean
  public firstDayOfWeek: Day

  protected weeks: number

  constructor(
    data: (number | null | undefined)[],
    lastDay: Date,
    firstDayOfWeek: Day,
    fullYear = false,
    weeks = 52,
  ) {
    this.firstDayOfWeek = firstDayOfWeek
    this.weeks = weeks
    const local = new UTCDateMini(lastDay)
    const interval = this.getInterval(local, fullYear)

    this.startDay = interval.start as Date
    this.endDay = interval.end as Date
    this.data = this.buildData(data, local)
    this.isFullYear = fullYear
  }

  protected getInterval(lastDay: Date, fullYear = false): Interval {
    const end = fullYear ? endOfYear(lastDay) : new UTCDateMini()
    let start = startOfYear(lastDay)
    if (!fullYear) {
      start = addDays(subWeeks(end, this.weeks), 1)
      if (!this.isFirstDayOfWeek(start)) {
        start = this.previousFirstDayOfWeek(start)
      }
    }
    return { start, end }
  }

  protected buildData(
    data: (number | null | undefined)[],
    lastDay: Date,
  ): (number | null | undefined)[] {
    const values = new Array(Math.max(0, 386 - data.length)).fill(
      undefined,
    ) as (number | null | undefined)[]
    values.push(...data)

    const days = differenceInDays(this.endDay, this.startDay) + 1
    const offset =
      values.length - days + differenceInDays(this.endDay, lastDay)
    return values.slice(offset)
  }

  getMonths(): ActivityMonth[] {
    const months: Date[] = eachMonthOfInterval({
      start: this.startDay,
      end: this.endDay,
    })
    const results: ActivityMonth[] = []

    for (let i = 0; i < months.length; i++) {
      const month = months[i] as Date
      let start = i === 0 ? this.startDay : startOfMonth(month)
      let end = i === months.length - 1 ? this.endDay : endOfMonth(start)

      if (!this.isFirstDayOfWeek(start)) {
        start =
          i === 0
            ? this.previousFirstDayOfWeek(start)
            : this.nextFirstDayOfWeek(start)
      }
      if (!this.isLastDayOfWeek(end)) {
        end = this.nextLastDayOfWeek(end)
      }

      const weeks = differenceInWeeks(end, start, { roundingMethod: "ceil" })
      if (weeks > 2) {
        results.push({
          text: format(month, "MMM").toLowerCase(),
          weeks,
        })
      } else if (i === 0) {
        results.push({ text: "", weeks })
      }
    }
    return results
  }

  getDays(): ActivityDay[] {
    const result: ActivityDay[] = []
    const buckets = this.getBuckets()
    const getValue = (v: number | null | undefined): string => {
      if (v === undefined) return "0"
      if (v === null || v === 0) return "0"
      for (let b = 0; b < 4; b++) {
        if (v <= (buckets[b] ?? 0)) return (1 + b).toString()
      }
      return "4"
    }

    for (let i = 0; i < this.startDay.getDay() - this.firstDayOfWeek; i++) {
      result.push({ level: "filler" })
    }

    const days = differenceInDays(this.endDay, this.startDay)
    let currentDate = this.startDay
    for (let i = 0; i <= days; i++) {
      const count = this.data[i]
      const day = format(currentDate, "EEEE dd MMM yyyy")
      result.push({
        level: getValue(count),
        label:
          count !== undefined && count !== null
            ? `${count} on ${day}`
            : `no activity on ${day}`,
      })
      currentDate = addDays(currentDate, 1)
    }

    for (let i = this.endDay.getDay() - this.firstDayOfWeek; i < 6; i++) {
      result.push({ level: "filler" })
    }

    return result
  }

  getTotal(): number {
    const days = differenceInDays(this.endDay, this.startDay)
    return (
      this.data.slice(0, days + 1).reduce((a, c) => {
        return (a ?? 0) + (c ?? 0)
      }, 0) ?? 0
    )
  }

  private getBuckets(): number[] {
    const filtered = this.data.filter(
      (it): it is number => it !== null && it !== undefined,
    )
    const sorted = [...filtered].sort((a, b) => a - b)
    const trimmed = sorted.slice(
      Math.round(sorted.length * 0.1),
      sorted.length - Math.round(sorted.length * 0.1),
    )
    const sum = trimmed.reduce((a, c) => a + c, 0)
    const mid = sum / trimmed.length
    return [Math.floor(mid / 2), Math.round(mid), Math.round(mid * 1.5)]
  }

  private isFirstDayOfWeek(date: Date): boolean {
    return toDate(date).getDay() === this.firstDayOfWeek
  }
  private previousFirstDayOfWeek(date: Date): Date {
    return previousDay(date, this.firstDayOfWeek)
  }
  private nextFirstDayOfWeek(date: Date): Date {
    return nextDay(date, this.firstDayOfWeek)
  }
  private isLastDayOfWeek(date: Date): boolean {
    return toDate(date).getDay() === (this.firstDayOfWeek + 6) % 7
  }
  private nextLastDayOfWeek(date: Date): Date {
    return nextDay(date, ((this.firstDayOfWeek + 6) % 7) as Day)
  }
}
