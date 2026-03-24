"use client"

import { useSyncExternalStore } from "react"

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false

  // Check for touch points
  if (navigator.maxTouchPoints > 0) return true

  // Check for iOS/Android user agents
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true

  // Check for window orientation support (mobile browsers)
  if ("orientation" in window) return true

  return false
}

const noop = (cb: () => void) => () => {}

function useIsMobile() {
  return useSyncExternalStore(noop, getIsMobile, () => false)
}

export { useIsMobile }
