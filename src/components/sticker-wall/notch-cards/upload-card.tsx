"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { MORPH_SPEED, CARD_WIDTH, CARD_WIDTH_COMPACT } from "./constants"
import { CardPage } from "./card-page"
import { UploadPage } from "./upload-page"
import { HelpPage } from "./help-page"
import { PlacePage } from "./place-page"
import { MessagePage } from "./message-page"

type UploadCardProps = {
  isPlacing: boolean
  isCompact: boolean
  notchPad: number
  showUpload: boolean
  showHelp: boolean
  showPlace: boolean
  showMessage: boolean
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
  stickerPreviewUrl: string | null
  transitionToPlace: () => void
  transitionToMessage: () => void
  handlePlaceConfirm: () => void
  handleHelpOpen: () => void
  username: string
  setUsername: (v: string) => void
  message: string
  setMessage: (v: string) => void
}

export { CARD_WIDTH, CARD_WIDTH_COMPACT } from "./constants"

export function UploadCard({
  isPlacing,
  isCompact,
  notchPad,
  showUpload,
  showHelp,
  showPlace,
  showMessage,
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
  stickerPreviewUrl,
  transitionToPlace,
  transitionToMessage,
  handlePlaceConfirm,
  handleHelpOpen,
  username,
  setUsername,
  message,
  setMessage,
}: UploadCardProps) {
  const cardWidth = isCompact ? CARD_WIDTH_COMPACT : CARD_WIDTH
  const isExpanded = showUpload || showHelp || showPlace || showMessage

  // Track measured content heights per page
  const [pageHeights, setPageHeights] = useState<Record<string, number>>({})
  const heightCallbacks = useMemo(
    () =>
      Object.fromEntries(
        (["upload", "help", "place", "message"] as const).map((key) => [
          key,
          (h: number) =>
            setPageHeights((p) => (p[key] === h ? p : { ...p, [key]: h })),
        ])
      ),
    []
  )
  const activePage = showUpload
    ? "upload"
    : showHelp
      ? "help"
      : showPlace
        ? "place"
        : showMessage
          ? "message"
          : null
  // Place and message pages share the same min height so the card doesn't resize between them
  const sharedMinHeight = Math.max(
    pageHeights.place ?? 0,
    pageHeights.message ?? 0
  )
  const cardHeight = activePage
    ? Math.max(
        pageHeights[activePage] ?? 0,
        activePage === "place" || activePage === "message" ? sharedMinHeight : 0
      )
    : 0

  // Measure spacer to get an explicit collapsed width so the spring can
  // interpolate between Cancel-width and Create+Help-width.
  const [collapsedWidth, setCollapsedWidth] = useState<number | null>(null)
  useEffect(() => {
    const el = notchBarRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth
      setCollapsedWidth((prev) => (prev === w ? prev : w))
    })
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
      {/* Upload page */}
      <CardPage
        show={showUpload}
        cardWidth={cardWidth}
        onHeight={heightCallbacks.upload}
      >
        <UploadPage
          handleCardClose={handleCardClose}
          uploadProcessing={uploadProcessing}
          uploadDragOver={uploadDragOver}
          setUploadDragOver={setUploadDragOver}
          uploadFileInputRef={uploadFileInputRef}
          handleUploadFile={handleUploadFile}
          targetProgress={targetProgress}
          stageText={stageText}
          processingDone={processingDone}
          transitionToPlace={transitionToPlace}
          uploadError={uploadError}
        />
      </CardPage>

      {/* Help page */}
      <CardPage
        show={showHelp}
        cardWidth={cardWidth}
        onHeight={heightCallbacks.help}
      >
        <HelpPage handleCardClose={handleCardClose} />
      </CardPage>

      {/* Preview sticker page */}
      <CardPage
        show={showPlace}
        cardWidth={cardWidth}
        minHeight={sharedMinHeight}
        onHeight={heightCallbacks.place}
      >
        <PlacePage
          handleCardClose={handleCardClose}
          stickerPreviewUrl={stickerPreviewUrl}
          transitionToMessage={transitionToMessage}
        />
      </CardPage>

      {/* Message page */}
      <CardPage
        show={showMessage}
        cardWidth={cardWidth}
        minHeight={sharedMinHeight}
        onHeight={heightCallbacks.message}
      >
        <MessagePage
          handleCardClose={handleCardClose}
          username={username}
          setUsername={setUsername}
          message={message}
          setMessage={setMessage}
          handlePlaceConfirm={handlePlaceConfirm}
        />
      </CardPage>

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

      {/* Outer wrapper — handles card expand/collapse fade */}
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
        {/* Cancel button (placing) */}
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

        {/* Create + Help buttons (not placing) */}
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
