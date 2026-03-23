interface WorkExperienceProps {
  company: string
  companyLink?: string
  position: string
  description: string
  startYear: number
  endYear?: number
}

function WorkExperience({
  company,
  companyLink,
  position,
  description,
  startYear,
  endYear,
}: WorkExperienceProps) {
  const yearDisplay =
    !endYear || endYear === startYear
      ? `${startYear}`
      : `${startYear}-${String(endYear).slice(-2)}`

  const companyEl = companyLink ? (
    <a
      href={companyLink}
      target="_blank"
      rel="noopener noreferrer"
      className="relative no-underline after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 after:ease-out hover:after:w-full"
    >
      {company}
    </a>
  ) : (
    company
  )

  return (
    <div className="text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="whitespace-nowrap">
          <span className="text-primary">{companyEl}</span>, {position}
        </span>
        <span className="flex-1 border-b border-current" />
        <span className="whitespace-nowrap">{yearDisplay}</span>
      </div>
      <p>{description}</p>
    </div>
  )
}

export { WorkExperience }
