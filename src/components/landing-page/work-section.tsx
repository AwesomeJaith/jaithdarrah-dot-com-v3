import { WorkExperience } from "../work-experience"

const jobs = [
  {
    company: "Mangrove",
    companyLink: "https://www.mangrove.ai",
    position: "Software Engineer Contractor",
    description:
      "Revamped Mangrove's landing page, trading dashboard, and docs. Improved reliability of Mangrove's services and squashed bugs.",
    startYear: 2026,
  },
  {
    company: "Walgreens",
    companyLink: "https://www.walgreens.com",
    position: "Software Engineer Intern",
    description:
      "Built and maintained Walgreens microservices. Enhanced web pages and docs and attended too many meetings.",
    startYear: 2025,
    endYear: 2025,
  },
]

function WorkSection() {
  return (
    <div className="w-full max-w-3xl">
      <div>Work</div>
      <div className="flex flex-col gap-4">
        {jobs.map((job) => (
          <WorkExperience key={`${job.company}-${job.startYear}`} {...job} />
        ))}
      </div>
    </div>
  )
}

export { WorkSection }
