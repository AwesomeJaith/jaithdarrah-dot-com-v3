"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import preset from "./sticker.json"
import type { Sticker } from "@/lib/stickers"
import { Button } from "@/components/ui/button"
import { FaXmark, FaUpload } from "react-icons/fa6"

type StickerCreatorProps = {
  onClose: () => void
  onStickerProcessed: (blob: Blob) => void
  onStickerSubmitted: (sticker: Sticker) => void
  stickerBlob: Blob | null
  placementPos: { x: number; y: number } | null
  placementRotation: number
}

// TODO: Improve sticker creator, integrate into notch, add transitions for going from bottom to top, transform increase with easings, also add slide through guide on how to create a sticker and place it.
export function StickerCreator({
  onClose,
  onStickerProcessed,
  onStickerSubmitted,
  stickerBlob,
  placementPos,
  placementRotation,
}: StickerCreatorProps) {
  const [step, setStep] = useState<"upload" | "details">(
    stickerBlob && placementPos ? "details" : "upload"
  )
  const [processing, setProcessing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [username, setUsername] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sticker-wall-username") ?? ""
    }
    return ""
  })
  const [message, setMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // If we already have a blob and position, go straight to details
  useEffect(() => {
    if (stickerBlob && placementPos) {
      setStep("details")
    }
  }, [stickerBlob, placementPos])

  const processImage = useCallback(
    async (file: File) => {
      setProcessing(true)
      setError(null)

      try {
        // Validate file type
        const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
        if (!allowedTypes.includes(file.type)) {
          setError("Only PNG, JPEG, and WebP images are allowed.")
          setProcessing(false)
          return
        }

        // Load pipemagic from CDN to bypass Turbopack transformation
        // which breaks @huggingface/transformers internals

        const { PipeMagic } = await import(
          /* webpackIgnore: true */
          "https://esm.sh/pipemagic@0.1.4"
        )
        const pm = new PipeMagic()
        const { blob } = await pm.run(preset, file, {
          onNodeStatus: (nodeId: string, status: string, error?: string) => {
            console.log(
              `[PipeMagic] ${nodeId}: ${status}${error ? ` - ${error}` : ""}`
            )
          },
          onNodeProgress: (nodeId: string, progress: number) => {
            console.log(`[PipeMagic] ${nodeId}: ${Math.round(progress * 100)}%`)
          },
        })
        onStickerProcessed(blob)
      } catch (err) {
        console.error("PipeMagic processing failed:", err)
        setError("Failed to process image. Please try another one.")
      } finally {
        setProcessing(false)
      }
    },
    [onStickerProcessed]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processImage(file)
    },
    [processImage]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processImage(file)
    },
    [processImage]
  )

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault()
      if (!stickerBlob || !placementPos || !username.trim()) return

      setSubmitting(true)
      setError(null)

      try {
        // Save username for next time
        localStorage.setItem(
          "jaith-darrah-sticker-wall-username",
          username.trim()
        )

        const formData = new FormData()
        formData.append("image", stickerBlob, "sticker.png")
        formData.append("username", username.trim())
        if (message.trim()) formData.append("message", message.trim())
        formData.append("x", String(placementPos.x))
        formData.append("y", String(placementPos.y))
        formData.append("width", "100")
        formData.append("height", "100")
        formData.append("rotation", String(placementRotation))

        const res = await fetch("/api/stickers", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? "Failed to submit sticker.")
          setSubmitting(false)
          return
        }

        const sticker = await res.json()
        onStickerSubmitted(sticker)
      } catch {
        setError("Failed to submit sticker. Please try again.")
      } finally {
        setSubmitting(false)
      }
    },
    [
      stickerBlob,
      placementPos,
      placementRotation,
      username,
      message,
      onStickerSubmitted,
    ]
  )

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-popover p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <FaXmark className="size-4" />
        </button>

        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Create your sticker</h2>
            <p className="text-sm text-muted-foreground">
              Upload an image and we&apos;ll turn it into a sticker.
            </p>

            {/* Drop zone */}
            <div
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {processing ? (
                // TODO: Change status to better progress indicator
                <p className="text-sm text-muted-foreground">Processing...</p>
              ) : (
                <>
                  <FaUpload className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPEG, or WebP (max 10MB)
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {step === "details" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Add your info</h2>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-sm font-medium">
                Message{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="message"
                maxLength={200}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Leave a message..."
                rows={2}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting || !username.trim()}>
              {submitting ? "Submitting..." : "Submit sticker"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Your sticker will appear after approval.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
