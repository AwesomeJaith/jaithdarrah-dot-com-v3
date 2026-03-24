import type { Metadata } from "next"
import { StatsSection } from "@/components/stats-page/stats-section"

export const metadata: Metadata = {
  title: "Stats",
  description:
    "Live stats from GitHub, Chess.com, MonkeyType, and Clash Royale.",
}

export default function StatsPage() {
  return <StatsSection />
}
