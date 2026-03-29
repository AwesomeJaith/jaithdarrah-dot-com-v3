import presetJson from "./sticker.json"
import type { PipelineDefinition } from "pipemagic"

const preset = presetJson as unknown as PipelineDefinition

// new Function body is opaque to Turbopack — prevents it from fetching CDN
// URLs or walking pipemagic/@jsquash/avif module graphs during the build.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function convertToAvif(blob: Blob): Promise<Blob> {
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

export async function processStickerImage(file: File): Promise<Blob> {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only PNG, JPEG, and WebP images are allowed.")
  }

  const { PipeMagic } = (await _cdn(
    "https://cdn.jsdelivr.net/npm/pipemagic@0.1.4/+esm"
  )) as typeof import("pipemagic")
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

  return convertToAvif(blob)
}
