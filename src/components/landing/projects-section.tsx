import { Project } from "../project"

const projects = [
  {
    projectName: "RoyaleOps Benchmark",
    projectOneLiner: "LLMs play Clash Royale.",
    projectLink: "https://benchmark.royaleops.com",
  },
  {
    projectName: "Mimetic",
    projectOneLiner: "AI guide for interfaces.",
    projectLink: "https://youtu.be/7pAhNsSvnbA",
  },
  {
    projectName: "Medivice",
    projectOneLiner: "AI-powered patient intake system.",
    projectLink: "https://youtu.be/-XF6Au_2mbg",
  },
  {
    projectName: "Noodlebot",
    projectOneLiner: "Git diff for Discord message edits.",
    projectLink: "https://github.com/AwesomeJaith/noodlebot",
  },
]

function ProjectsSection() {
  return (
    <div className="w-full max-w-3xl">
      <div>Projects</div>
      <div className="flex flex-col">
        {projects.map((project) => (
          <Project key={`${project.projectName}`} {...project} />
        ))}
      </div>
    </div>
  )
}

export { ProjectsSection }
