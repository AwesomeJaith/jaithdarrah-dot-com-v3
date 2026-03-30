import Link from "next/link"
import { CatLogo } from "@/components/ui/cat-logo"

function Header() {
  return (
    <header className="w-full max-w-3xl py-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="group relative" aria-label="Go to homepage">
          <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-3/4 translate-y-2 -rotate-12 text-sm font-bold opacity-0 transition-all duration-400 will-change-transform group-hover:-translate-y-0.5 group-hover:opacity-100 group-active:opacity-0">
            meow!
          </span>
          <CatLogo className="h-12 w-12 dark:fill-white" />
        </Link>
        <div className="flex gap-4">
          <Link href="/fun" className="link-underline">
            Fun
          </Link>
          <Link href="/stats" className="link-underline">
            Stats
          </Link>
          <a
            href="/Jaith_Darrah_resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline"
          >
            Resume
          </a>
        </div>
      </nav>
    </header>
  )
}

export { Header }
