"use client"

interface ProjectProps {
  projectName: string
  projectOneLiner: string
  projectLink: string
}

function Project({ projectName, projectOneLiner, projectLink }: ProjectProps) {
  return (
    <a
      href={projectLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group/item flex w-full cursor-pointer items-center justify-between rounded-sm bg-muted p-2 no-underline transition-opacity duration-200 ease-linear group-hover/list:opacity-50 hover:opacity-100!"
    >
      <div className="flex min-w-0 shrink items-center gap-1.5">
        <div className="max-w-0 overflow-hidden opacity-0 blur-[2px] transition-all duration-200 ease-out group-hover/item:max-w-5 group-hover/item:opacity-100 group-hover/item:blur-none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="#4cda82"
            width="14"
            height="14"
            className="shrink-0"
          >
            <path d="M16.0037 9.41421L7.39712 18.0208L5.98291 16.6066L14.5895 8H7.00373V6H18.0037V17H16.0037V9.41421Z" />
          </svg>
        </div>
        <span className="truncate transition-all duration-200 ease-out">
          {projectName}
        </span>
      </div>
      <span className="hidden shrink-0 text-sm whitespace-nowrap text-muted-foreground sm:block">
        {projectOneLiner}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="#4cda82"
        width="14"
        height="14"
        className="shrink-0 sm:hidden"
      >
        <path d="M16.0037 9.41421L7.39712 18.0208L5.98291 16.6066L14.5895 8H7.00373V6H18.0037V17H16.0037V9.41421Z" />
      </svg>
    </a>
  )
}

export { Project }
