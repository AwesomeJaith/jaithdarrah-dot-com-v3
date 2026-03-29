import { useCallback, useEffect, useRef, useState } from "react"
import { processStickerImage } from "./process-sticker-image"

type UseUploadCardParams = {
  onStickerProcessed: (blob: Blob) => Promise<void>
}

export function useUploadCard({ onStickerProcessed }: UseUploadCardParams) {
  const [expandedCard, setExpandedCard] = useState<
    "upload" | "help" | "place" | null
  >(null)
  const showUpload = expandedCard === "upload"
  const showHelp = expandedCard === "help"
  const showPlace = expandedCard === "place"
  const [uploadProcessing, setUploadProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const uploadFileInputRef = useRef<HTMLInputElement>(null!)
  const notchRootRef = useRef<HTMLDivElement>(null!)
  const abortControllerRef = useRef<AbortController | null>(null)

  const openUploadCard = useCallback(() => {
    setExpandedCard("upload")
  }, [])

  const openHelpCard = useCallback(() => {
    setExpandedCard("help")
  }, [])

  const handleCardClose = useCallback(() => {
    // Abort in-flight processing if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setExpandedCard(null)
    setUploadError(null)
    setUploadDragOver(false)
    setUploadProcessing(false)
    setUploadProgress(0)
    setPendingBlob(null)
  }, [])

  const handleUploadFile = useCallback(
    async (file: File) => {
      setUploadProcessing(true)
      setUploadProgress(0)
      setUploadError(null)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const avifBlob = await processStickerImage(file, {
          signal: controller.signal,
          onProgress: setUploadProgress,
        })
        // Show "Place sticker" card instead of immediately entering placement
        setPendingBlob(avifBlob)
        setExpandedCard("place")
        setUploadError(null)
      } catch (err) {
        // Silently ignore user-initiated abort
        if (err instanceof DOMException && err.name === "AbortError") return
        setUploadError(
          err instanceof Error
            ? err.message
            : "Failed to process image. Please try another one."
        )
      } finally {
        setUploadProcessing(false)
        abortControllerRef.current = null
      }
    },
    []
  )

  const handlePlaceConfirm = useCallback(async () => {
    if (!pendingBlob) return
    await onStickerProcessed(pendingBlob)
    setExpandedCard(null)
    setPendingBlob(null)
    setUploadProgress(0)
  }, [pendingBlob, onStickerProcessed])

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
    showPlace,
    openUploadCard,
    openHelpCard,
    uploadProcessing,
    uploadProgress,
    uploadError,
    uploadDragOver,
    setUploadDragOver,
    uploadFileInputRef,
    notchRootRef,
    handleCardClose,
    handleUploadFile,
    handlePlaceConfirm,
    clearError,
  }
}
