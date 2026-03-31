import sharp from "sharp"
import { pipeline, RawImage, env } from "@huggingface/transformers"
import { addOutline } from "./outline.js"

// Use local model cache (set via TRANSFORMERS_CACHE env var)
env.allowLocalModels = true

// --- Segmentation model singleton ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Segmenter = any
let segmenter: Segmenter | null = null
let segmenterLoading: Promise<Segmenter> | null = null

async function getSegmenter(): Promise<Segmenter> {
  if (segmenter) return segmenter
  if (!segmenterLoading) {
    segmenterLoading = (
      pipeline("image-segmentation", "briaai/RMBG-1.4", {
        device: "cpu",
        dtype: "fp32",
      } as never) as Promise<Segmenter>
    ).then((s: Segmenter) => {
      segmenter = s
      return s
    })
  }
  return segmenterLoading
}

/** Pre-load the model on startup so the first request is fast. */
export async function warmupModel(): Promise<void> {
  console.log("Warming up RMBG-1.4 model...")
  const start = Date.now()
  await getSegmenter()
  console.log(`Model ready in ${((Date.now() - start) / 1000).toFixed(1)}s`)
}

// --- Pipeline constants (from sticker.json) ---

const MAX_SIZE = 2048
const NORMALIZE_SIZE = 2048
const NORMALIZE_PADDING = 160
const OUTLINE_THICKNESS = 50
const OUTLINE_COLOR = { r: 1, g: 1, b: 1 } // #ffffff
const OUTLINE_OPACITY = 1
const OUTLINE_POSITION_VALUE = 1 // "outside"
const OUTLINE_THRESHOLD = 5
const AVIF_QUALITY = 50
const ALPHA_THRESHOLD = 10
const GRID_SIZE = 16

// --- Helper functions ---

function findBoundingBox(
  rgba: Buffer,
  width: number,
  height: number
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null
  return { minX, minY, maxX, maxY }
}

function encodeAlphaMask(rgba: Buffer, width: number, height: number): string {
  const bytes = new Uint8Array(Math.ceil((GRID_SIZE * GRID_SIZE) / 8))
  const cellW = width / GRID_SIZE
  const cellH = height / GRID_SIZE

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const px = Math.min(Math.floor((gx + 0.5) * cellW), width - 1)
      const py = Math.min(Math.floor((gy + 0.5) * cellH), height - 1)
      if (rgba[(py * width + px) * 4 + 3] > ALPHA_THRESHOLD) {
        const bit = gy * GRID_SIZE + gx
        bytes[bit >> 3] |= 1 << (bit & 7)
      }
    }
  }

  return Buffer.from(bytes).toString("base64")
}

// --- Main pipeline ---

export interface ProcessResult {
  image: string // base64-encoded AVIF
  width: number
  height: number
  alphaMask: string
}

export async function processSticker(
  inputBuffer: Buffer
): Promise<ProcessResult> {
  // Step 1: Resize input
  const resized = await sharp(inputBuffer)
    .resize(MAX_SIZE, MAX_SIZE, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let { data: rgba } = resized
  let { width, height } = resized.info

  // Step 2: Remove background
  const model = await getSegmenter()
  const rawImage = new RawImage(
    new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
    width,
    height,
    4
  )

  const result = (await model(rawImage, {
    threshold: 0.5,
  })) as Array<{ mask?: { data: Uint8Array; channels?: number } }>

  const maskData = result[0]?.mask
  if (maskData) {
    const maskPixels = maskData.data
    const maskChannels = maskData.channels || 1
    const output = Buffer.alloc(width * height * 4)
    for (let i = 0; i < width * height; i++) {
      output[i * 4] = rgba[i * 4]
      output[i * 4 + 1] = rgba[i * 4 + 1]
      output[i * 4 + 2] = rgba[i * 4 + 2]
      const maskVal =
        maskChannels >= 4 ? maskPixels[i * maskChannels] : maskPixels[i]
      output[i * 4 + 3] = maskVal ?? 255
    }
    rgba = output
  }

  // Step 3: Normalize (crop to content, scale, center in padded square)
  const bbox = findBoundingBox(rgba, width, height)
  if (!bbox) {
    // No opaque pixels — return a 1x1 transparent AVIF
    const avif = await sharp(Buffer.alloc(4), {
      raw: { width: 1, height: 1, channels: 4 },
    })
      .avif({ quality: AVIF_QUALITY })
      .toBuffer()
    return {
      image: avif.toString("base64"),
      width: 1,
      height: 1,
      alphaMask: "",
    }
  }

  const cropW = bbox.maxX - bbox.minX + 1
  const cropH = bbox.maxY - bbox.minY + 1
  const available = NORMALIZE_SIZE - 2 * NORMALIZE_PADDING
  const scale = Math.min(available / cropW, available / cropH)
  const scaledW = Math.round(cropW * scale)
  const scaledH = Math.round(cropH * scale)

  const cropped = await sharp(rgba, {
    raw: { width, height, channels: 4 },
  })
    .extract({
      left: bbox.minX,
      top: bbox.minY,
      width: cropW,
      height: cropH,
    })
    .resize(scaledW, scaledH)
    .raw()
    .toBuffer()

  // Center in NORMALIZE_SIZE x NORMALIZE_SIZE canvas
  const offsetX = Math.round((NORMALIZE_SIZE - scaledW) / 2)
  const offsetY = Math.round((NORMALIZE_SIZE - scaledH) / 2)

  const normalized = await sharp(cropped, {
    raw: { width: scaledW, height: scaledH, channels: 4 },
  })
    .extend({
      top: offsetY,
      bottom: NORMALIZE_SIZE - scaledH - offsetY,
      left: offsetX,
      right: NORMALIZE_SIZE - scaledW - offsetX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer()

  width = NORMALIZE_SIZE
  height = NORMALIZE_SIZE

  // Step 4: Outline
  const outlined = addOutline(normalized, width, height, {
    thickness: OUTLINE_THICKNESS,
    r: OUTLINE_COLOR.r,
    g: OUTLINE_COLOR.g,
    b: OUTLINE_COLOR.b,
    opacity: OUTLINE_OPACITY,
    positionValue: OUTLINE_POSITION_VALUE,
    threshold: OUTLINE_THRESHOLD,
  })

  // Step 5: Trim transparent pixels
  const trimBox = findBoundingBox(outlined, width, height)
  if (!trimBox) {
    const avif = await sharp(Buffer.alloc(4), {
      raw: { width: 1, height: 1, channels: 4 },
    })
      .avif({ quality: AVIF_QUALITY })
      .toBuffer()
    return {
      image: avif.toString("base64"),
      width: 1,
      height: 1,
      alphaMask: "",
    }
  }

  const trimW = trimBox.maxX - trimBox.minX + 1
  const trimH = trimBox.maxY - trimBox.minY + 1

  const trimmed = await sharp(outlined, {
    raw: { width, height, channels: 4 },
  })
    .extract({
      left: trimBox.minX,
      top: trimBox.minY,
      width: trimW,
      height: trimH,
    })
    .raw()
    .toBuffer()

  // Step 6: AVIF encode
  const avifBuffer = await sharp(trimmed, {
    raw: { width: trimW, height: trimH, channels: 4 },
  })
    .avif({ quality: AVIF_QUALITY })
    .toBuffer()

  // Step 7: Alpha mask
  const alphaMask = encodeAlphaMask(trimmed, trimW, trimH)

  return {
    image: avifBuffer.toString("base64"),
    width: trimW,
    height: trimH,
    alphaMask,
  }
}
