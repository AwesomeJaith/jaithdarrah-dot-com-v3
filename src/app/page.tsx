import { AboutSection } from "@/components/landing-page/about-section"
import { ProjectsSection } from "@/components/landing-page/projects-section"
import { WorkSection } from "@/components/landing-page/work-section"
import { SocialsSection } from "@/components/socials-section"

export default function Page() {
  return (
    <>
      <AboutSection />
      <WorkSection />
      <ProjectsSection />
      <SocialsSection />
    </>
  )
}
