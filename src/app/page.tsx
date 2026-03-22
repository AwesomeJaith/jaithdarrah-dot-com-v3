import { AboutSection } from "@/components/landing-page/about-section"
import { Header } from "@/components/header"
import { ProjectsSection } from "@/components/landing-page/projects-section"
import { WorkSection } from "@/components/landing-page/work-section"
import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 px-6">
      <Header />
      <AboutSection />
      <WorkSection />
      <ProjectsSection />
      <Footer />
    </div>
  )
}
