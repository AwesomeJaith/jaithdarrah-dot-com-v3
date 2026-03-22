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
    <a href={companyLink} target="_blank" rel="noopener noreferrer">
      {company}
    </a>
  ) : (
    company
  )

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="whitespace-nowrap">
          {companyEl}, {position}
        </span>
        <span className="flex-1 border-b border-current" />
        <span className="whitespace-nowrap">{yearDisplay}</span>
      </div>
      <p>{description}</p>
    </div>
  )
}

export { WorkExperience }
