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
      className="link-underline"
    >
      {company}
    </a>
  ) : (
    company
  )

  return (
    <div className="text-muted-foreground">
      {/* Desktop */}
      <div className="hidden items-center gap-4 sm:flex">
        <span className="min-w-0">
          <span className="text-primary">{companyEl}</span>,{" "}
          <span className="whitespace-nowrap">{position}</span>
        </span>
        <span className="flex-1 border-b border-current" />
        <span className="shrink-0 whitespace-nowrap text-primary">
          {yearDisplay}
        </span>
      </div>
      {/* Mobile */}
      <div className="flex flex-col pb-1 sm:hidden">
        <div className="flex items-center justify-between">
          <span className="text-primary">{companyEl}</span>
          <span className="text-primary">{yearDisplay}</span>
        </div>
        <span>{position}</span>
      </div>
      <p>{description}</p>
    </div>
  )
}

export { WorkExperience }
