import { AboutSection } from "@/components/landing/about-section"
import { Header } from "@/components/header"
import { ProjectsSection } from "@/components/landing/projects-section"
import { WorkSection } from "@/components/landing/work-section"
import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col p-6">
      <Header />
      <AboutSection />
      <WorkSection />
      <ProjectsSection />
      <Footer />
    </div>
  )
}
