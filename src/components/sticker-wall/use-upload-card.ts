import { useCallback, useEffect, useRef, useState } from "react"
import { processStickerImage } from "./process-sticker-image"

type UseUploadCardParams = {
  onStickerProcessed: (blob: Blob) => Promise<void>
}

export function useUploadCard({ onStickerProcessed }: UseUploadCardParams) {
  const [showUpload, setShowUpload] = useState(false)
  const [uploadProcessing, setUploadProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const uploadFileInputRef = useRef<HTMLInputElement>(null!)
  const notchRootRef = useRef<HTMLDivElement>(null!)

  const handleUploadClose = useCallback(() => {
    if (uploadProcessing) return
    setShowUpload(false)
    setUploadError(null)
    setUploadDragOver(false)
  }, [uploadProcessing])

  const handleUploadFile = useCallback(
    async (file: File) => {
      setUploadProcessing(true)
      setUploadError(null)
      try {
        const avifBlob = await processStickerImage(file)
        await onStickerProcessed(avifBlob)
        setShowUpload(false)
        setUploadError(null)
      } catch (err) {
        setUploadError(
          err instanceof Error
            ? err.message
            : "Failed to process image. Please try another one."
        )
      } finally {
        setUploadProcessing(false)
      }
    },
    [onStickerProcessed]
  )

  // Close upload card on click outside
  useEffect(() => {
    if (!showUpload) return
    const handler = (e: MouseEvent) => {
      if (
        notchRootRef.current &&
        !notchRootRef.current.contains(e.target as Node)
      ) {
        handleUploadClose()
      }
    }
    document.addEventListener("pointerdown", handler)
    return () => document.removeEventListener("pointerdown", handler)
  }, [showUpload, handleUploadClose])

  const clearError = useCallback(() => setUploadError(null), [])

  return {
    showUpload,
    setShowUpload,
    uploadProcessing,
    uploadError,
    uploadDragOver,
    setUploadDragOver,
    uploadFileInputRef,
    notchRootRef,
    handleUploadClose,
    handleUploadFile,
    clearError,
  }
}
