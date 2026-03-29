import presetJson from "./sticker.json"
import type { PipelineDefinition } from "pipemagic"

const preset = presetJson as unknown as PipelineDefinition

// new Function body is opaque to Turbopack — prevents it from fetching CDN
// URLs or walking pipemagic/@jsquash/avif module graphs during the build.
const _cdn = new Function("u", "return import(u)") as (
  u: string
) => Promise<unknown>

let avifReady: Promise<void> | null = null
let avifEncode: typeof import("@jsquash/avif/encode").default

async function loadAvifEncoder() {
  const mod = (await _cdn(
    "https://cdn.jsdelivr.net/npm/@jsquash/avif@2.1.1/encode.js/+esm"
  )) as typeof import("@jsquash/avif/encode")
  const wasmUrl =
    "https://cdn.jsdelivr.net/npm/@jsquash/avif@2.1.1/codec/enc/avif_enc.wasm"
  const wasmModule = await WebAssembly.compileStreaming(fetch(wasmUrl))
  await mod.init(wasmModule)
  avifEncode = mod.default
}

export async function convertToAvif(
  blob: Blob,
  signal?: AbortSignal
): Promise<Blob> {
  if (!avifReady) avifReady = loadAvifEncoder()
  await avifReady
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const avifBuffer = await avifEncode(imageData, { quality: 50 })
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  return new Blob([avifBuffer], { type: "image/avif" })
}

// Node weights for progress reporting (cumulative ranges 0–1)
const NODE_WEIGHTS: Record<string, { start: number; end: number }> = {
  Xlx_HtAq: { start: 0, end: 0.05 }, // Image Input
  elQUGDvY: { start: 0.05, end: 0.65 }, // Remove BG (slow)
  YwZr2ifj: { start: 0.65, end: 0.75 }, // Normalize
  zb7Z1Xtl: { start: 0.75, end: 0.85 }, // Outline
  _VuOKszH: { start: 0.85, end: 0.9 }, // Output
}

export type ProcessOptions = {
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}

export async function processStickerImage(
  file: File,
  options?: ProcessOptions
): Promise<Blob> {
  const { signal, onProgress } = options ?? {}

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PNG, JPEG, and WebP images are allowed.")
  }

  const { PipeMagic } = (await _cdn(
    "https://cdn.jsdelivr.net/npm/pipemagic@0.1.4/+esm"
  )) as typeof import("pipemagic")
  const pm = new PipeMagic()
  const { blob } = await pm.run(preset, file, {
    signal,
    onNodeStatus: (nodeId: string, status: string, error?: string) => {
      console.log(
        `[PipeMagic] ${nodeId}: ${status}${error ? ` - ${error}` : ""}`
      )
      const w = NODE_WEIGHTS[nodeId]
      if (w && onProgress) {
        if (status === "running") onProgress(w.start)
        else if (status === "done") onProgress(w.end)
      }
    },
    onNodeProgress: (nodeId: string, progress: number) => {
      console.log(`[PipeMagic] ${nodeId}: ${Math.round(progress * 100)}%`)
      const w = NODE_WEIGHTS[nodeId]
      if (w && onProgress) {
        onProgress(w.start + (w.end - w.start) * progress)
      }
    },
  })

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  onProgress?.(0.9)

  const avifBlob = await convertToAvif(blob, signal)
  onProgress?.(1)
  return avifBlob
}
