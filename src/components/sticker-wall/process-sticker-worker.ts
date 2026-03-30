// Web Worker — PipeMagic pipeline + AVIF encoding, all off the main thread.

const _cdn = new Function("u", "return import(u)") as (
  u: string
) => Promise<unknown>

const NODE_WEIGHTS: Record<string, { start: number; end: number }> = {
  Xlx_HtAq: { start: 0, end: 0.05 },
  elQUGDvY: { start: 0.05, end: 0.65 },
  YwZr2ifj: { start: 0.65, end: 0.75 },
  zb7Z1Xtl: { start: 0.75, end: 0.85 },
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
  | { type: "done"; blob: Blob }
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
  const mod = (await _cdn(
    "https://cdn.jsdelivr.net/npm/@jsquash/avif@2.1.1/encode.js/+esm"
  )) as {
    init: (wasm: WebAssembly.Module) => Promise<void>
    default: typeof avifEncode
  }
  const wasmUrl =
    "https://cdn.jsdelivr.net/npm/@jsquash/avif@2.1.1/codec/enc/avif_enc.wasm"
  const wasmModule = await WebAssembly.compileStreaming(fetch(wasmUrl))
  await mod.init(wasmModule)
  avifEncode = mod.default
}

async function convertToAvif(blob: Blob): Promise<Blob> {
  if (!avifReady) avifReady = loadAvifEncoder()
  await avifReady
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const avifBuffer = await avifEncode(imageData, { quality: 50 })
  return new Blob([avifBuffer], { type: "image/avif" })
}

// --- Main handler ---

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { file, preset } = e.data

  try {
    const { PipeMagic } = (await _cdn(
      "https://cdn.jsdelivr.net/npm/pipemagic@0.1.4/+esm"
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
    const avifBlob = await convertToAvif(blob)
    reportProgress(1)
    send({ type: "done", blob: avifBlob })
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
