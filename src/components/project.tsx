interface ProjectProps {
  projectName: string
  projectOneLiner: string
  projectLink: string
}

// TODO: Tweak colors and hover effects
function Project({ projectName, projectOneLiner, projectLink }: ProjectProps) {
  return (
    <div className="flex w-full items-center gap-4">
      <a
        href={projectLink}
        target="_blank"
        rel="noopener noreferrer"
        className="-mx-3 flex flex-1 flex-col rounded-md px-3 py-2 no-underline hover:bg-[#F5F4F4] dark:hover:bg-gray-200"
      >
        <span>{projectName}</span>
        <span className="text-[#63635e]">{projectOneLiner}</span>
      </a>
    </div>
  )
}

export { Project }
