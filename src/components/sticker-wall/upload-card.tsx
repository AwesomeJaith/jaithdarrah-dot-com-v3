"use client"

import { AnimatePresence, motion } from "motion/react"
import { FaUpload } from "react-icons/fa6"
import { Button } from "@/components/ui/button"

const MORPH_SPEED = 1

type UploadCardProps = {
  isPlacing: boolean
  showUpload: boolean
  uploadProcessing: boolean
  uploadError: string | null
  uploadDragOver: boolean
  setUploadDragOver: (v: boolean) => void
  uploadFileInputRef: React.RefObject<HTMLInputElement>
  notchRootRef: React.RefObject<HTMLDivElement>
  notchBarRef: React.RefObject<HTMLDivElement>
  handleUploadClose: () => void
  handleUploadFile: (file: File) => void
  handlePlaceStickerClick: () => void
}

export function UploadCard({
  isPlacing,
  showUpload,
  uploadProcessing,
  uploadError,
  uploadDragOver,
  setUploadDragOver,
  uploadFileInputRef,
  notchRootRef,
  notchBarRef,
  handleUploadClose,
  handleUploadFile,
  handlePlaceStickerClick,
}: UploadCardProps) {
  return (
    <div className="absolute bottom-0 left-1/2 z-40 -translate-x-1/2">
      <motion.div
        ref={notchRootRef}
        className="relative overflow-hidden"
        initial={false}
        animate={{
          width: showUpload ? 320 : "auto",
          height: showUpload ? 220 : "auto",
          borderRadius: showUpload ? 14 : 8,
          backgroundColor: showUpload
            ? "var(--color-popover)"
            : "oklch(0% 0 0 / 0)",
          boxShadow: showUpload
            ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
            : "none",
        }}
        transition={{
          type: "spring",
          stiffness: 550 / MORPH_SPEED,
          damping: 45,
          mass: 0.7,
        }}
      >
        {/* Upload card content — full size, anchored to bottom so it reveals from bottom up */}
        <div
          className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col gap-3 p-4"
          style={{
            width: 320,
            height: 220,
            pointerEvents: showUpload ? "all" : "none",
            visibility: showUpload ? "visible" : "hidden",
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
                  <button
                    onClick={handleUploadClose}
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
                </div>

                <div
                  className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
                    uploadDragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => uploadFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setUploadDragOver(true)
                  }}
                  onDragLeave={() => setUploadDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setUploadDragOver(false)
                    const file = e.dataTransfer.files[0]
                    if (file) handleUploadFile(file)
                  }}
                >
                  {uploadProcessing ? (
                    <p className="text-sm text-muted-foreground">
                      Processing...
                    </p>
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

        {/* Invisible spacer — in flow to give the container its collapsed height */}
        <div ref={notchBarRef} className="invisible flex items-center gap-1">
          <Button size="lg" tabIndex={-1} aria-hidden>
            {isPlacing ? "Cancel" : "Create a sticker"}
          </Button>
          {!isPlacing && (
            <Button size="icon-lg" tabIndex={-1} aria-hidden>
              ?
            </Button>
          )}
        </div>

        {/* Button row — pinned to bottom center, fades out/in */}
        <motion.div
          className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1"
          animate={{ opacity: showUpload ? 0 : 1 }}
          transition={{
            duration: 0.1 * MORPH_SPEED,
            delay: showUpload ? 0 : 0.15 * MORPH_SPEED,
          }}
        >
          <Button
            variant={isPlacing ? "outline" : "default"}
            size="lg"
            onClick={handlePlaceStickerClick}
            style={{ pointerEvents: showUpload ? "none" : "auto" }}
          >
            {isPlacing ? "Cancel" : "Create a sticker"}
          </Button>
          {!isPlacing && (
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => {}}
              style={{ pointerEvents: showUpload ? "none" : "auto" }}
            >
              ?
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
