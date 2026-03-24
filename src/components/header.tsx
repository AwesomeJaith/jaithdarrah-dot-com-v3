import Link from "next/link"

function Header() {
  return (
    <header className="w-full max-w-3xl py-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="group relative">
          <span className="pointer-events-none absolute -top-3 left-1/2 -translate-x-3/4 translate-y-2 -rotate-12 text-sm font-bold opacity-0 transition-all duration-400 will-change-transform group-hover:-translate-y-0.5 group-hover:opacity-100 group-active:opacity-0">
            meow!
          </span>
          <svg
            id="a"
            data-name="cat"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 160 160"
            className="h-12 w-12 dark:fill-white"
          >
            <path d="M158.38,81.66c-3.28-14.48-11.4-27.13-22.57-36.16-11.16-9.03-25.37-14.43-40.84-14.43s-29.67,5.4-40.83,14.43c-3,2.42-5.78,5.09-8.29,8-.31.35-.88.15-.88-.32v-7.68s-.23,0-.23,0l-18.38,11.93c-2.35,1.53-5.39,1.53-7.74,0L.24,45.51h-.24v42.82c0,3.15,2.55,5.7,5.7,5.7h137.44c1.72,0,3.13,1.41,3.13,3.12v1.21c0,24.61-17.33,45.18-40.47,50.15-2.41.52-4.12,2.68-4.12,5.15v1.35c0,3.11,2.83,5.5,5.88,4.91,29.89-5.86,52.44-32.19,52.44-63.8,0-4.97-.56-9.8-1.62-14.44ZM15.74,84.85c-5.75,3.08-11.51-2.71-8.39-8.42.43-.78,1.08-1.43,1.86-1.86,5.71-3.12,11.5,2.64,8.42,8.39-.43.79-1.09,1.46-1.88,1.88ZM33.79,85.4c-1.11.31-2.11.39-2.99.23-2.88-.43-5.08-2.92-5.08-5.92,0-3.33,2.69-6.01,6.01-6.01.72,0,1.43.12,2.06.37,3.28,1.2,5.23,5.22,2.94,9.13-.64,1.1-1.73,1.86-2.95,2.21Z" />
          </svg>
        </Link>
        <div className="flex gap-4">
          <Link href="/fun" className="link-underline">
            Fun
          </Link>
          <Link href="/stats" className="link-underline">
            Stats
          </Link>
          <Link
            href="/Jaith_Darrah_resume.pdf"
            target="_blank"
            className="link-underline"
          >
            Resume
          </Link>
        </div>
      </nav>
    </header>
  )
}

export { Header }
