import type { Metadata } from "next"
import { AboutSection } from "@/components/landing-page/about-section"
import { ProjectsSection } from "@/components/landing-page/projects-section"
import { WorkSection } from "@/components/landing-page/work-section"
import { SocialsSection } from "@/components/socials-section"
import { generateArticleSchema } from "@/lib/structured-data"

export const metadata: Metadata = {
  alternates: {
    canonical: "https://jaithdarrah.com",
  },
}

export default function Page() {
  const articleSchema = generateArticleSchema({
    title: "Jaith Darrah - Full-Stack Software Engineer Specializing in Microservices & AI Integration",
    description: "Full-stack software engineer specializing in microservices architecture, AI integration, and scalable web applications. Expert in TypeScript, React, and backend systems. Available for contract work and open-source collaboration.",
    datePublished: "2026-04-08",
    url: "https://jaithdarrah.com"
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <AboutSection />
      <WorkSection />
      <ProjectsSection />
      
      <section id="contact" className="w-full max-w-3xl">
        <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
        <div className="bg-card border rounded-lg p-6">
          <p className="text-muted-foreground mb-4">
            Interested in working together on AI integration, microservices architecture, or full-stack development? 
            I'm available for consulting projects and open-source collaboration.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:jaith@jaithdarrah.com"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Email Me
            </a>
            <a
              href="https://github.com/AwesomeJaith"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://linkedin.com/in/jaith-darrah"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </section>
      
      <SocialsSection />
    </>
  )
}
