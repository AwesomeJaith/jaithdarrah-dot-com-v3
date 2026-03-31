import presetJson from "./sticker.json"
import type { PipelineDefinition } from "pipemagic"
import { encodeAlphaMask } from "@/lib/overlap"

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
    "https://esm.sh/@jsquash/avif@2.1.1/encode.js"
  )) as typeof import("@jsquash/avif/encode")
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

  if (maxX < minX || maxY < minY) {
    return { imageData: new ImageData(1, 1), width: 1, height: 1 }
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

export async function trimAndConvertToAvif(
  blob: Blob,
  signal?: AbortSignal
): Promise<{ blob: Blob; width: number; height: number; alphaMask: string }> {
  if (!avifReady) avifReady = loadAvifEncoder()
  await avifReady
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  const bitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const trimmed = trimTransparentPixels(fullImageData)
  const alphaMask = encodeAlphaMask(trimmed.imageData)
  const avifBuffer = await avifEncode(trimmed.imageData, { quality: 50 })
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
  return {
    blob: new Blob([avifBuffer], { type: "image/avif" }),
    width: trimmed.width,
    height: trimmed.height,
    alphaMask,
  }
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
): Promise<{ blob: Blob; width: number; height: number; alphaMask: string }> {
  const { signal, onProgress } = options ?? {}

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PNG, JPEG, and WebP images are allowed.")
  }

  const { PipeMagic } = (await _cdn(
    "https://esm.sh/pipemagic@0.1.4"
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

  const result = await trimAndConvertToAvif(blob, signal)
  onProgress?.(1)
  return result
}
