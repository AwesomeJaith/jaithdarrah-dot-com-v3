import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import presetJson from "./sticker.json"
import type { WorkerMessage } from "./process-sticker-worker"

export type StickerData = {
  blob: Blob
  imageWidth: number
  imageHeight: number
  alphaMask: string
  effect: string | null
  username: string
  message: string
}

type UseUploadCardParams = {
  onStickerProcessed: (data: StickerData) => Promise<void>
  notchRootRef: React.RefObject<HTMLDivElement>
}

type CardState = "upload" | "help" | "place" | "message" | null

export function useUploadCard({
  onStickerProcessed,
  notchRootRef,
}: UseUploadCardParams) {
  const [expandedCard, setExpandedCard] = useState<CardState>(null)
  const showUpload = expandedCard === "upload"
  const showHelp = expandedCard === "help"
  const showPlace = expandedCard === "place"
  const showMessage = expandedCard === "message"
  const [uploadProcessing, setUploadProcessing] = useState(false)
  const [targetProgress, setTargetProgress] = useState(0)
  const [stageText, setStageText] = useState("Loading image...")
  const [processingDone, setProcessingDone] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)
  const [username, setUsername] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jaith-darrah-sticker-wall-username") ?? ""
    }
    return ""
  })
  const [message, setMessage] = useState("")
  const uploadFileInputRef = useRef<HTMLInputElement>(null!)
  const workerRef = useRef<Worker | null>(null)
  const pendingDimsRef = useRef<{
    width: number
    height: number
    alphaMask: string
  } | null>(null)

  const openUploadCard = useCallback(() => {
    setExpandedCard("upload")
  }, [])

  const openHelpCard = useCallback(() => {
    setExpandedCard("help")
  }, [])

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
  }, [])

  const handleCardClose = useCallback(() => {
    terminateWorker()
    setExpandedCard(null)
    setUploadError(null)
    setUploadDragOver(false)
    setUploadProcessing(false)
    setTargetProgress(0)
    setStageText("Loading image...")
    setProcessingDone(false)
    setPendingBlob(null)
    setMessage("")
  }, [terminateWorker])

  const handleUploadFile = useCallback(
    (file: File) => {
      const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        setUploadError("Only PNG, JPEG, and WebP images are allowed.")
        return
      }

      terminateWorker()
      setUploadProcessing(true)
      setTargetProgress(0)
      setStageText("Loading image...")
      setProcessingDone(false)
      setUploadError(null)

      const worker = new Worker(
        new URL("./process-sticker-worker.ts", import.meta.url)
      )
      workerRef.current = worker

      worker.onmessage = async (e: MessageEvent<WorkerMessage>) => {
        const msg = e.data
        switch (msg.type) {
          case "progress":
            setTargetProgress(msg.progress)
            setStageText(msg.stage)
            break
          case "done":
            setPendingBlob(msg.blob)
            pendingDimsRef.current = {
              width: msg.width,
              height: msg.height,
              alphaMask: msg.alphaMask,
            }
            setProcessingDone(true)
            terminateWorker()
            break
          case "error":
            setUploadError(msg.message)
            setUploadProcessing(false)
            terminateWorker()
            break
        }
      }

      worker.onerror = () => {
        setUploadError("Failed to process image. Please try another one.")
        setUploadProcessing(false)
        terminateWorker()
      }

      worker.postMessage({ file, preset: presetJson })
    },
    [terminateWorker]
  )

  const transitionToPlace = useCallback(() => {
    setUploadProcessing(false)
    setProcessingDone(false)
    setTargetProgress(0)
    setExpandedCard("place")
  }, [])

  const transitionToMessage = useCallback(() => {
    setExpandedCard("message")
  }, [])

  const handlePlaceConfirm = useCallback(async () => {
    if (!pendingBlob || !pendingDimsRef.current) return
    if (!username.trim()) return
    localStorage.setItem("jaith-darrah-sticker-wall-username", username.trim())
    await onStickerProcessed({
      blob: pendingBlob,
      imageWidth: pendingDimsRef.current.width,
      imageHeight: pendingDimsRef.current.height,
      alphaMask: pendingDimsRef.current.alphaMask,
      effect: null,
      username: username.trim(),
      message: message.trim(),
    })
    setExpandedCard(null)
    setPendingBlob(null)
    setMessage("")
  }, [pendingBlob, username, message, onStickerProcessed])

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

  // Create object URL for sticker preview, revoke on change/unmount
  const stickerPreviewUrl = useMemo(
    () => (pendingBlob ? URL.createObjectURL(pendingBlob) : null),
    [pendingBlob]
  )
  useEffect(() => {
    return () => {
      if (stickerPreviewUrl) URL.revokeObjectURL(stickerPreviewUrl)
    }
  }, [stickerPreviewUrl])

  // Clean up worker on unmount
  useEffect(() => terminateWorker, [terminateWorker])

  const clearError = useCallback(() => setUploadError(null), [])

  return {
    showUpload,
    showHelp,
    showPlace,
    showMessage,
    openUploadCard,
    openHelpCard,
    uploadProcessing,
    targetProgress,
    stageText,
    processingDone,
    uploadError,
    uploadDragOver,
    setUploadDragOver,
    uploadFileInputRef,
    handleCardClose,
    handleUploadFile,
    stickerPreviewUrl,
    transitionToPlace,
    transitionToMessage,
    handlePlaceConfirm,
    username,
    setUsername,
    message,
    setMessage,
    clearError,
  }
}
