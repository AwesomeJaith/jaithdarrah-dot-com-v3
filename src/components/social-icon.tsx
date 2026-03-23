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
      className={`flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform hover:z-10 hover:scale-110 active:scale-97 ${className ?? ""}`}
    >
      {socialIcon}
    </a>
  )
}

export { SocialIcon }
