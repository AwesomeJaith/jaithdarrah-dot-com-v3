import { useCallback, useEffect, useRef, useState } from "react"
import { processStickerImage } from "./process-sticker-image"

type UseUploadCardParams = {
  onStickerProcessed: (blob: Blob) => Promise<void>
}

export function useUploadCard({ onStickerProcessed }: UseUploadCardParams) {
  const [expandedCard, setExpandedCard] = useState<
    "upload" | "help" | null
  >(null)
  const showUpload = expandedCard === "upload"
  const showHelp = expandedCard === "help"
  const [uploadProcessing, setUploadProcessing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const uploadFileInputRef = useRef<HTMLInputElement>(null!)
  const notchRootRef = useRef<HTMLDivElement>(null!)

  const openUploadCard = useCallback(() => {
    setExpandedCard("upload")
  }, [])

  const openHelpCard = useCallback(() => {
    setExpandedCard("help")
  }, [])

  const handleCardClose = useCallback(() => {
    if (expandedCard === "upload" && uploadProcessing) return
    setExpandedCard(null)
    setUploadError(null)
    setUploadDragOver(false)
  }, [expandedCard, uploadProcessing])

  const handleUploadFile = useCallback(
    async (file: File) => {
      setUploadProcessing(true)
      setUploadError(null)
      try {
        const avifBlob = await processStickerImage(file)
        await onStickerProcessed(avifBlob)
        setExpandedCard(null)
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

  // Close card on click outside
  useEffect(() => {
    if (expandedCard === null) return
    const handler = (e: MouseEvent) => {
      if (
        notchRootRef.current &&
        !notchRootRef.current.contains(e.target as Node)
      ) {
        handleCardClose()
      }
    }
    document.addEventListener("pointerdown", handler)
    return () => document.removeEventListener("pointerdown", handler)
  }, [expandedCard, handleCardClose])

  const clearError = useCallback(() => setUploadError(null), [])

  return {
    showUpload,
    showHelp,
    openUploadCard,
    openHelpCard,
    uploadProcessing,
    uploadError,
    uploadDragOver,
    setUploadDragOver,
    uploadFileInputRef,
    notchRootRef,
    handleCardClose,
    handleUploadFile,
    clearError,
  }
}
