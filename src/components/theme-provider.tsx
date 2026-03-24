"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function toggleThemeWithTransition(
  resolvedTheme: string | undefined,
  setTheme: (theme: string) => void,
) {
  const newTheme = resolvedTheme === "dark" ? "light" : "dark"

  if (!document.startViewTransition) {
    setTheme(newTheme)
    return
  }

  const cat = document.querySelector('[data-name="cat"]')
  if (cat) {
    const rect = cat.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    document.documentElement.style.setProperty("--transition-x", `${x}px`)
    document.documentElement.style.setProperty("--transition-y", `${y}px`)
  }

  document.startViewTransition(() => {
    // Apply class change synchronously so the view transition captures it.
    // next-themes' useEffect applies it async, which is too late.
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    document.documentElement.style.colorScheme = newTheme
    // Keep next-themes state in sync
    setTheme(newTheme)
  })
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      toggleThemeWithTransition(resolvedTheme, setTheme)
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider, toggleThemeWithTransition }
