import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { StatsSection } from "@/components/stats-page/stats-section"

export default function StatsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 px-6">
      <Header />
      <StatsSection />
      <Footer />
    </div>
  )
}
