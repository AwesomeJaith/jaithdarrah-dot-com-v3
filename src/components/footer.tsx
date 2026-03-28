"use client"

function Footer({ children }: { children?: React.ReactNode }) {
  return (
    <footer className="mt-auto flex w-full max-w-3xl flex-col gap-4 py-8">
      {children}
    </footer>
  )
}

export { Footer }
