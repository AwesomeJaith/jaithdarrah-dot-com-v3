const STICKER_SERVER_URL = process.env.NEXT_PUBLIC_STICKER_SERVER_URL

export function isStickerServerAvailable(): boolean {
  return !!STICKER_SERVER_URL
}

export function isTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return navigator.maxTouchPoints > 0
}

export async function processStickerRemote(
  file: File,
  signal?: AbortSignal
): Promise<{ blob: Blob; width: number; height: number; alphaMask: string }> {
  if (!STICKER_SERVER_URL) {
    throw new Error("Sticker server URL not configured")
  }

  const formData = new FormData()
  formData.append("image", file)

  const res = await fetch(`${STICKER_SERVER_URL}/process`, {
    method: "POST",
    body: formData,
    signal,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      (body as { error?: string })?.error ?? `Server error ${res.status}`
    )
  }

  const data = (await res.json()) as {
    image: string
    width: number
    height: number
    alphaMask: string
  }

  // Decode base64 AVIF to Blob
  const binary = atob(data.image)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return {
    blob: new Blob([bytes], { type: "image/avif" }),
    width: data.width,
    height: data.height,
    alphaMask: data.alphaMask,
  }
}
