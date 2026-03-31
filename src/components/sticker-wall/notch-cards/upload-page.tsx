"use client"

import { FaUpload } from "react-icons/fa6"
import { motion } from "motion/react"
import { CloseButton } from "./close-button"
import { ProcessingDisplay } from "./processing-display"
import { springTransition } from "./constants"

type UploadPageProps = {
  handleCardClose: () => void
  uploadProcessing: boolean
  uploadDragOver: boolean
  setUploadDragOver: (v: boolean) => void
  uploadFileInputRef: React.RefObject<HTMLInputElement>
  handleUploadFile: (file: File) => void
  targetProgress: number
  stageText: string
  processingDone: boolean
  transitionToPlace: () => void
  uploadError: string | null
}

export function UploadPage({
  handleCardClose,
  uploadProcessing,
  uploadDragOver,
  setUploadDragOver,
  uploadFileInputRef,
  handleUploadFile,
  targetProgress,
  stageText,
  processingDone,
  transitionToPlace,
  uploadError,
}: UploadPageProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <motion.h2
          layoutId="notch-title"
          layout="position"
          className="text-sm font-medium"
          transition={springTransition}
        >
          Create your sticker
        </motion.h2>
        <CloseButton onClick={handleCardClose} />
      </div>

      <div
        className={`grid cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
          uploadDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        }`}
        onClick={() => !uploadProcessing && uploadFileInputRef.current?.click()}
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
        {/* Both states occupy the same grid cell so the container
            always matches the taller one's height — no morph. */}
        <div
          className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-2 px-6 py-6 transition-opacity"
          style={{
            opacity: uploadProcessing ? 1 : 0,
            pointerEvents: uploadProcessing ? "auto" : "none",
          }}
        >
          <ProcessingDisplay
            targetProgress={targetProgress}
            stageText={stageText}
            processingDone={processingDone}
            onComplete={transitionToPlace}
          />
        </div>
        <div
          className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-2 px-6 py-6 transition-opacity"
          style={{
            opacity: uploadProcessing ? 0 : 1,
            pointerEvents: uploadProcessing ? "none" : "auto",
          }}
        >
          <FaUpload className="size-6 text-muted-foreground" />
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-sm text-muted-foreground">
              Drag & drop or click
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP</p>
          </div>
        </div>
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

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
    </>
  )
}
