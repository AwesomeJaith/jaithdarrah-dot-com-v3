"use client"

import { SocialIcon } from "./social-icon"
import { FaGithub, FaXTwitter } from "react-icons/fa6"
import { FaLinkedin } from "react-icons/fa"
import { Mail } from "lucide-react"

const socials = [
  {
    socialIcon: <FaXTwitter />,
    socialLink: "https://x.com/darrah_jaith",
    label: "X.com profile",
    className: "-rotate-6",
  },
  {
    socialIcon: <FaLinkedin />,
    socialLink: "https://linkedin.com/in/jaithdarrah",
    label: "LinkedIn profile",
    className: "rotate-3",
  },
  {
    socialIcon: <Mail size={16} />,
    socialLink: "mailto:hi@jaithdarrah.com",
    label: "Email",
    className: "-rotate-3",
  },
  {
    socialIcon: <FaGithub />,
    socialLink: "https://github.com/awesomejaith",
    label: "GitHub profile",
    className: "rotate-6",
  },
]

// TODO: Improve feel of social icons. Don't quite fit with the vibe.
function Footer({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="flex w-full max-w-3xl flex-col gap-4 py-16">
      <div>
        I&apos;m friendly and don&apos;t bite. Feel free to say hello!{" "}
        <span className="inline-flex align-middle">
          {socials.map((social) => (
            <SocialIcon key={social.label} {...social} />
          ))}
        </span>
      </div>
      {children}
    </footer>
  )
}

export { Footer }
