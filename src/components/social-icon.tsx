interface SocialIconProps {
  socialIcon: React.ReactNode
  socialLink: string
  label: string
  className?: string
}

function SocialIcon({
  socialIcon,
  socialLink,
  label,
  className,
}: SocialIconProps) {
  return (
    <a
      href={socialLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`flex size-8 items-center justify-center rounded-sm border border-background bg-primary text-primary-foreground transition-transform hover:z-10 hover:scale-110 active:scale-97 ${className ?? ""}`}
    >
      {socialIcon}
    </a>
  )
}

export { SocialIcon }
