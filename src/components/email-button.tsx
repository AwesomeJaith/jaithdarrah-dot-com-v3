"use client"

import { useState, useRef } from "react"
import { Mail, Check } from "lucide-react"

const EMAIL = "hi@jaithdarrah.com"

function EmailButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(EMAIL)
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className="relative">
      <button
        onClick={handleCopy}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false)
          setCopied(false)
        }}
        aria-label="Copy email address"
        className={`flex size-8 cursor-pointer items-center justify-center rounded-sm border border-background bg-primary text-primary-foreground transition-transform hover:z-10 hover:scale-110 active:scale-97 ${className ?? ""}`}
      >
        <span className="relative grid size-4 place-items-center">
          <Mail
            size={16}
            className={`col-start-1 row-start-1 transition-all duration-200 ${copied ? "scale-50 opacity-0 blur-sm" : "blur-0 scale-100 opacity-100"}`}
          />
          <Check
            size={16}
            className={`col-start-1 row-start-1 transition-all duration-200 ${copied ? "blur-0 scale-100 opacity-100" : "scale-50 opacity-0 blur-sm"}`}
          />
        </span>
      </button>

      {hovered && (
        <div className="absolute bottom-full left-1/2 z-10000 mb-2 -translate-x-1/2">
          <h6 className="origin-bottom animate-pop-in rounded-lg bg-primary px-3 py-2 text-xs text-nowrap text-background">
            {copied ? "Copied!" : "Click to copy email"}
          </h6>
        </div>
      )}
    </span>
  )
}

export { EmailButton }
