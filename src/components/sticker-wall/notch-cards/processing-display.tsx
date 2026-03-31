"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CatLogo } from "@/components/ui/cat-logo"
import { Progress } from "@/components/ui/progress"
import { ShimmeringText } from "@/components/ui/shimmering-text"

/** Ensures each stage text is visible for at least `minMs`. Flushes to latest when `flush` is true. */
function useStagedText(rawStage: string, minMs: number, flush: boolean) {
  const [displayed, setDisplayed] = useState(rawStage)
  const queue = useRef<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // When flush (processing done), skip to the latest stage immediately
  useEffect(() => {
    if (flush && queue.current.length > 0) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
      setDisplayed(queue.current[queue.current.length - 1])
      queue.current = []
    }
  }, [flush])

  useEffect(() => {
    const last =
      queue.current.length > 0
        ? queue.current[queue.current.length - 1]
        : displayed
    if (rawStage === last) return
    queue.current.push(rawStage)

    if (!timerRef.current) {
      const drain = () => {
        const next = queue.current.shift()
        if (next !== undefined) {
          setDisplayed(next)
          if (queue.current.length > 0) {
            timerRef.current = setTimeout(drain, minMs)
          } else {
            timerRef.current = undefined
          }
        } else {
          timerRef.current = undefined
        }
      }
      timerRef.current = setTimeout(drain, minMs)
    }
  }, [rawStage, displayed, minMs])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return displayed
}

export function ProcessingDisplay({
  targetProgress,
  stageText,
  processingDone,
  onComplete,
}: {
  targetProgress: number
  stageText: string
  processingDone: boolean
  onComplete: () => void
}) {
  const progress = processingDone ? 1 : Math.min(targetProgress, 0.95)
  const displayedStage = useStagedText(stageText, 1200, processingDone)
  const completeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (processingDone && !completeTimer.current) {
      completeTimer.current = setTimeout(onComplete, 1200)
    }
  }, [processingDone, onComplete])
  useEffect(() => () => clearTimeout(completeTimer.current), [])

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 px-6">
      <CatLogo shimmer startOnView={false} duration={0.5} repeatDelay={0.3} />
      <Progress
        className="w-full **:data-[slot=progress-indicator]:duration-200 **:data-[slot=progress-indicator]:ease-out"
        value={Math.round(progress * 100)}
      />
      <div className="relative h-5 w-full">
        <AnimatePresence>
          <motion.div
            key={displayedStage}
            className="absolute inset-x-0 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ShimmeringText
              text={displayedStage}
              className="inline-block text-xs"
              startOnView={false}
              duration={0.5}
              repeatDelay={0.3}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
