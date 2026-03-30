"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { FaUpload } from "react-icons/fa6"
import { Button } from "@/components/ui/button"
import { CatLogo } from "@/components/ui/cat-logo"
import { Progress } from "@/components/ui/progress"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { useInterpolatedProgress } from "./use-interpolated-progress"

const MORPH_SPEED = 1
export const CARD_WIDTH = 320
const CARD_HEIGHT = 220
export const CARD_WIDTH_COMPACT = 260
const CARD_HEIGHT_COMPACT = 200

type UploadCardProps = {
  isPlacing: boolean
  isCompact: boolean
  notchPad: number
  showUpload: boolean
  showHelp: boolean
  showPlace: boolean
  uploadProcessing: boolean
  targetProgress: number
  stageText: string
  processingDone: boolean
  uploadError: string | null
  uploadDragOver: boolean
  setUploadDragOver: (v: boolean) => void
  uploadFileInputRef: React.RefObject<HTMLInputElement>
  notchRootRef: React.RefObject<HTMLDivElement>
  notchBarRef: React.RefObject<HTMLDivElement>
  handleCardClose: () => void
  handleUploadFile: (file: File) => void
  handlePlaceStickerClick: () => void
  transitionToPlace: () => void
  handlePlaceConfirm: () => void
  handleHelpOpen: () => void
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground"
      aria-label="Close"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  )
}

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

function ProcessingDisplay({
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
  const progress = useInterpolatedProgress(targetProgress, processingDone)
  const displayedStage = useStagedText(stageText, 1200, processingDone)
  const completeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // When progress reaches ~100% after done, transition after a brief pause.
  // Timer is stored in a ref so rAF-driven re-renders don't cancel it.
  useEffect(() => {
    if (processingDone && progress > 0.99 && !completeTimer.current) {
      completeTimer.current = setTimeout(onComplete, 1000)
    }
  }, [processingDone, progress, onComplete])
  useEffect(() => () => clearTimeout(completeTimer.current), [])

  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 px-6">
      <CatLogo shimmer startOnView={false} duration={0.5} repeatDelay={0.3} />
      <Progress className="w-full" value={Math.round(progress * 100)} />
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

export function UploadCard({
  isPlacing,
  isCompact,
  notchPad,
  showUpload,
  showHelp,
  showPlace,
  uploadProcessing,
  targetProgress,
  stageText,
  processingDone,
  uploadError,
  uploadDragOver,
  setUploadDragOver,
  uploadFileInputRef,
  notchRootRef,
  notchBarRef,
  handleCardClose,
  handleUploadFile,
  handlePlaceStickerClick,
  transitionToPlace,
  handlePlaceConfirm,
  handleHelpOpen,
}: UploadCardProps) {
  const cardWidth = isCompact ? CARD_WIDTH_COMPACT : CARD_WIDTH
  const cardHeight = isCompact ? CARD_HEIGHT_COMPACT : CARD_HEIGHT
  const isExpanded = showUpload || showHelp || showPlace

  // Measure spacer to get an explicit collapsed width so the spring can
  // interpolate between Cancel-width and Create+Help-width.
  const [collapsedWidth, setCollapsedWidth] = useState<number | null>(null)
  useEffect(() => {
    const el = notchBarRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setCollapsedWidth(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [notchBarRef])

  const springTransition = {
    type: "spring" as const,
    stiffness: 550 / MORPH_SPEED,
    damping: 45,
    mass: 0.7,
  }

  return (
    <motion.div
      ref={notchRootRef}
      className="relative overflow-hidden"
      initial={false}
      animate={{
        width: isExpanded ? cardWidth : (collapsedWidth ?? "auto"),
        height: isExpanded ? cardHeight : "auto",
        borderRadius: isExpanded ? 14 - notchPad : 8,
        backgroundColor: isExpanded
          ? "var(--color-popover)"
          : "oklch(0% 0 0 / 0)",
        boxShadow: isExpanded
          ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
          : "none",
      }}
      transition={springTransition}
    >
      {/* Upload card content */}
      <div
        className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col gap-3 p-4"
        style={{
          width: cardWidth,
          height: cardHeight,
          pointerEvents: showUpload ? "all" : "none",
          zIndex: showUpload ? 1 : 0,
        }}
      >
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.15 * MORPH_SPEED,
                delay: showUpload ? 0.1 * MORPH_SPEED : 0,
              }}
              className="flex h-full flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Create your sticker</h2>
                <CloseButton onClick={handleCardClose} />
              </div>

              <div
                className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
                  uploadDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() =>
                  !uploadProcessing && uploadFileInputRef.current?.click()
                }
                onDragOver={(e) => {
                  e.preventDefault()
                  if (!uploadProcessing) setUploadDragOver(true)
                }}
                onDragLeave={() => setUploadDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setUploadDragOver(false)
                  if (uploadProcessing) return
                  const file = e.dataTransfer.files[0]
                  if (file) handleUploadFile(file)
                }}
              >
                {uploadProcessing ? (
                  <ProcessingDisplay
                    targetProgress={targetProgress}
                    stageText={stageText}
                    processingDone={processingDone}
                    onComplete={transitionToPlace}
                  />
                ) : (
                  <>
                    <FaUpload className="size-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop or click
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG, or WebP
                    </p>
                  </>
                )}
              </div>

              <input
                ref={uploadFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadFile(file)
                }}
                className="hidden"
              />

              {uploadError && (
                <p className="text-xs text-destructive">{uploadError}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help card content */}
      <div
        className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col gap-3 p-4"
        style={{
          width: cardWidth,
          height: cardHeight,
          pointerEvents: showHelp ? "all" : "none",
          zIndex: showHelp ? 1 : 0,
        }}
      >
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.15 * MORPH_SPEED,
                delay: showHelp ? 0.1 * MORPH_SPEED : 0,
              }}
              className="flex h-full flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">How it works</h2>
                <CloseButton onClick={handleCardClose} />
              </div>

              <div className="flex flex-1 flex-col gap-2 rounded-lg bg-muted p-3">
                <div className="flex h-16 items-center justify-center rounded-md bg-background/50 text-muted-foreground">
                  <span className="text-xs">Tutorial video coming soon</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload an image, click anywhere on the canvas to place it, and
                  scroll to rotate before placing.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Place sticker card content */}
      <div
        className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col gap-3 p-4"
        style={{
          width: cardWidth,
          height: cardHeight,
          pointerEvents: showPlace ? "all" : "none",
          zIndex: showPlace ? 1 : 0,
        }}
      >
        <AnimatePresence>
          {showPlace && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.15 * MORPH_SPEED,
                delay: showPlace ? 0.1 * MORPH_SPEED : 0,
              }}
              className="flex h-full flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Ready!</h2>
                <CloseButton onClick={handleCardClose} />
              </div>

              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  Your sticker is ready to place on the canvas.
                </p>
                <Button size="lg" onClick={handlePlaceConfirm}>
                  Place sticker
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invisible spacer — mirrors visible buttons so notch fits snugly */}
      <div
        ref={notchBarRef}
        className="invisible flex w-fit items-center gap-1"
      >
        <Button size="lg" tabIndex={-1} aria-hidden>
          {isPlacing ? "Cancel" : "Create a sticker"}
        </Button>
        {!isPlacing && (
          <Button size="icon-lg" tabIndex={-1} aria-hidden>
            ?
          </Button>
        )}
      </div>

      {/* Outer wrapper — handles card expand/collapse fade (original timing) */}
      <motion.div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        initial={false}
        animate={{ opacity: isExpanded ? 0 : 1 }}
        transition={{
          duration: 0.1 * MORPH_SPEED,
          delay: isExpanded ? 0 : 0.15 * MORPH_SPEED,
        }}
        style={{ pointerEvents: isExpanded ? "none" : "auto" }}
      >
        {/* Cancel button (placing) — shell appears instantly for clip reveal */}
        <motion.div
          className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1"
          initial={false}
          animate={{ opacity: isPlacing ? 1 : 0 }}
          transition={{ duration: 0.05 * MORPH_SPEED, delay: 0 }}
          style={{ pointerEvents: isPlacing ? "auto" : "none" }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={handlePlaceStickerClick}
            className="text-center transition-all duration-150 active:scale-98"
          >
            <motion.span
              initial={false}
              animate={{ opacity: isPlacing ? 1 : 0 }}
              transition={{
                duration: 0.1 * MORPH_SPEED,
                delay: isPlacing ? 0.15 * MORPH_SPEED : 0,
              }}
            >
              Cancel
            </motion.span>
          </Button>
        </motion.div>

        {/* Create + Help buttons (not placing) — shells appear instantly for clip reveal */}
        <motion.div
          className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1"
          initial={false}
          animate={{ opacity: !isPlacing ? 1 : 0 }}
          transition={{ duration: 0.05 * MORPH_SPEED, delay: 0 }}
          style={{ pointerEvents: !isPlacing ? "auto" : "none" }}
        >
          <Button
            size="lg"
            onClick={handlePlaceStickerClick}
            className="text-center transition-all duration-150 active:scale-98"
          >
            <motion.span
              initial={false}
              animate={{ opacity: !isPlacing ? 1 : 0 }}
              transition={{
                duration: 0.1 * MORPH_SPEED,
                delay: !isPlacing ? 0.15 * MORPH_SPEED : 0,
              }}
            >
              Create a sticker
            </motion.span>
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={handleHelpOpen}
            className="text-center transition-all duration-150 active:scale-98"
          >
            <motion.span
              initial={false}
              animate={{ opacity: !isPlacing ? 1 : 0 }}
              transition={{
                duration: 0.1 * MORPH_SPEED,
                delay: !isPlacing ? 0.15 * MORPH_SPEED : 0,
              }}
            >
              ?
            </motion.span>
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
