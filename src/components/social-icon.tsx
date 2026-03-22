interface SocialIconProps {
  socialIcon: React.ReactNode
  socialLink: string
  label: string
  className?: string
}

function SocialIcon({ socialIcon, socialLink, label, className }: SocialIconProps) {
  return (
    <a
      href={socialLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`flex size-9 items-center justify-center rounded-lg border border-neutral-200 transition-colors hover:z-10 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 ${className ?? ""}`}
    >
      {socialIcon}
    </a>
  )
}

export { SocialIcon }
