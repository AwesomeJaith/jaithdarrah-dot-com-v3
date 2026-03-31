"use client"

import { Button } from "@/components/ui/button"
import { CloseButton } from "./close-button"

type MessagePageProps = {
  handleCardClose: () => void
  username: string
  setUsername: (v: string) => void
  message: string
  setMessage: (v: string) => void
  handlePlaceConfirm: () => void
}

export function MessagePage({
  handleCardClose,
  username,
  setUsername,
  message,
  setMessage,
  handlePlaceConfirm,
}: MessagePageProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Add your info</h2>
        <CloseButton onClick={handleCardClose} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <label htmlFor="notch-username" className="text-xs font-medium">
              Username
            </label>
            <span className="text-xs text-muted-foreground">
              {username.length}/30
            </span>
          </div>
          <input
            id="notch-username"
            type="text"
            required
            maxLength={30}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your name"
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm transition-colors outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <label htmlFor="notch-message" className="text-xs font-medium">
              Message <span className="text-muted-foreground">(optional)</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {message.length}/200
            </span>
          </div>
          <textarea
            id="notch-message"
            maxLength={200}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message..."
            rows={3}
            className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm transition-colors outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <Button
        size="lg"
        onClick={handlePlaceConfirm}
        disabled={!username.trim()}
        className="w-full"
      >
        Place sticker
      </Button>
    </>
  )
}
