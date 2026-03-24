import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "404",
}

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground">Page not found</p>
      <Link href="/" className="link-underline text-primary">
        Go home
      </Link>
    </div>
  )
}
