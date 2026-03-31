// Web Worker — PipeMagic pipeline + AVIF encoding, all off the main thread.

const _cdn = new Function("u", "return import(u)") as (
  u: string
) => Promise<unknown>

const NODE_WEIGHTS: Record<string, { start: number; end: number }> = {
  Xlx_HtAq: { start: 0, end: 0.15 },
  elQUGDvY: { start: 0.15, end: 0.45 },
  YwZr2ifj: { start: 0.45, end: 0.65 },
  zb7Z1Xtl: { start: 0.65, end: 0.85 },
  _VuOKszH: { start: 0.85, end: 0.9 },
}

const STAGE_NAMES: Record<string, string> = {
  Xlx_HtAq: "Loading image...",
  elQUGDvY: "Removing background...",
  YwZr2ifj: "Normalizing image...",
  zb7Z1Xtl: "Adding some sparkles...",
  _VuOKszH: "Almost done...",
}

export type WorkerInput = {
  file: File
  preset: unknown
}

export type WorkerMessage =
  | { type: "progress"; progress: number; stage: string }
  | {
      type: "done"
      blob: Blob
      width: number
      height: number
      alphaMask: string
    }
  | { type: "error"; message: string }

function send(msg: WorkerMessage) {
  postMessage(msg)
}

let currentStage = "Loading image..."

function reportProgress(progress: number) {
  send({ type: "progress", progress, stage: currentStage })
}

// --- AVIF encoder (loaded lazily) ---

let avifReady: Promise<void> | null = null
let avifEncode: (
  data: ImageData,
  opts: { quality: number }
) => Promise<ArrayBuffer>

async function loadAvifEncoder() {
  const mod = (await _cdn("https://esm.sh/@jsquash/avif@2.1.1/encode.js")) as {
    init: (wasm: WebAssembly.Module) => Promise<void>
    default: typeof avifEncode
  }
  const wasmUrl =
    "https://cdn.jsdelivr.net/npm/@jsquash/avif@2.1.1/codec/enc/avif_enc.wasm"
  const wasmModule = await WebAssembly.compileStreaming(fetch(wasmUrl))
  await mod.init(wasmModule)
  avifEncode = mod.default
}

function trimTransparentPixels(imageData: ImageData): {
  imageData: ImageData
  width: number
  height: number
} {
  const { data, width, height } = imageData
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // No opaque pixels found — return a 1x1 fallback
  if (maxX < minX || maxY < minY) {
    return {
      imageData: new ImageData(1, 1),
      width: 1,
      height: 1,
    }
  }

  const trimW = maxX - minX + 1
  const trimH = maxY - minY + 1
  const trimmed = new ImageData(trimW, trimH)
  for (let y = 0; y < trimH; y++) {
    const srcOffset = ((minY + y) * width + minX) * 4
    const dstOffset = y * trimW * 4
    trimmed.data.set(data.subarray(srcOffset, srcOffset + trimW * 4), dstOffset)
  }
  return { imageData: trimmed, width: trimW, height: trimH }
}

function encodeAlphaMask(imageData: ImageData, gridSize = 16): string {
  const { data, width, height } = imageData
  const bytes = new Uint8Array(Math.ceil((gridSize * gridSize) / 8))
  const cellW = width / gridSize
  const cellH = height / gridSize

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const px = Math.min(Math.floor((gx + 0.5) * cellW), width - 1)
      const py = Math.min(Math.floor((gy + 0.5) * cellH), height - 1)
      if (data[(py * width + px) * 4 + 3] > 10) {
        const bit = gy * gridSize + gx
        bytes[bit >> 3] |= 1 << (bit & 7)
      }
    }
  }

  return btoa(String.fromCharCode(...bytes))
}

async function trimAndConvertToAvif(
  blob: Blob
): Promise<{ blob: Blob; width: number; height: number; alphaMask: string }> {
  if (!avifReady) avifReady = loadAvifEncoder()
  await avifReady
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const trimmed = trimTransparentPixels(fullImageData)
  const alphaMask = encodeAlphaMask(trimmed.imageData)
  const avifBuffer = await avifEncode(trimmed.imageData, { quality: 50 })
  return {
    blob: new Blob([avifBuffer], { type: "image/avif" }),
    width: trimmed.width,
    height: trimmed.height,
    alphaMask,
  }
}

// --- Main handler ---

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { file, preset } = e.data

  try {
    const { PipeMagic } = (await _cdn(
      "https://esm.sh/pipemagic@0.1.4?bundle"
    )) as typeof import("pipemagic")

    const pm = new PipeMagic()
    const { blob } = await pm.run(
      preset as Parameters<typeof pm.run>[0],
      file,
      {
        onNodeStatus: (nodeId: string, status: string, error?: string) => {
          if (error) {
            send({ type: "error", message: error })
            return
          }
          const w = NODE_WEIGHTS[nodeId]
          if (w) {
            if (STAGE_NAMES[nodeId]) currentStage = STAGE_NAMES[nodeId]
            if (status === "running") reportProgress(w.start)
            else if (status === "done") reportProgress(w.end)
          }
        },
        onNodeProgress: (nodeId: string, progress: number) => {
          const w = NODE_WEIGHTS[nodeId]
          if (w) {
            reportProgress(w.start + (w.end - w.start) * progress)
          }
        },
      }
    )

    currentStage = "Encoding..."
    reportProgress(0.9)
    const result = await trimAndConvertToAvif(blob)
    reportProgress(1)
    send({
      type: "done",
      blob: result.blob,
      width: result.width,
      height: result.height,
      alphaMask: result.alphaMask,
    })
  } catch (err) {
    send({
      type: "error",
      message:
        err instanceof Error
          ? err.message
          : "Failed to process image. Please try another one.",
    })
  }
}
