/**
 * Chamfer distance outline algorithm.
 * Ported from pipemagic's CPU fallback (executeOutlineCanvas).
 * Works on raw RGBA buffers instead of ImageData/OffscreenCanvas.
 */

export interface OutlineOptions {
  thickness: number
  r: number
  g: number
  b: number
  opacity: number
  /** 0 = center, 1 = outside, -1 = inside (mapped from position string) */
  positionValue: number
  threshold: number
}

function chamferDistance(
  dist: Float32Array,
  width: number,
  height: number
): void {
  // Forward pass (top-left → bottom-right)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      dist[idx] = Math.min(
        dist[idx],
        dist[(y - 1) * width + (x - 1)] + 1.414,
        dist[(y - 1) * width + x] + 1,
        dist[(y - 1) * width + (x + 1)] + 1.414,
        dist[y * width + (x - 1)] + 1
      )
    }
  }
  // Backward pass (bottom-right → top-left)
  for (let y = height - 2; y >= 1; y--) {
    for (let x = width - 2; x >= 1; x--) {
      const idx = y * width + x
      dist[idx] = Math.min(
        dist[idx],
        dist[(y + 1) * width + (x + 1)] + 1.414,
        dist[(y + 1) * width + x] + 1,
        dist[(y + 1) * width + (x - 1)] + 1.414,
        dist[y * width + (x + 1)] + 1
      )
    }
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Add an outline around non-transparent pixels in an RGBA buffer.
 * Returns a new Buffer with the outline composited.
 */
export function addOutline(
  rgba: Buffer,
  width: number,
  height: number,
  opts: OutlineOptions
): Buffer {
  const pixelCount = width * height

  // Extract normalized alpha channel
  const alpha = new Float32Array(pixelCount)
  for (let i = 0; i < pixelCount; i++) {
    alpha[i] = rgba[i * 4 + 3] / 255
  }

  // Compute outer distance field (distance from opaque to transparent)
  const outerDist = new Float32Array(pixelCount)
  outerDist.fill(1e10)
  for (let i = 0; i < pixelCount; i++) {
    if (alpha[i] > 0.1) outerDist[i] = 0
  }
  chamferDistance(outerDist, width, height)

  // Compute inner distance field (distance from transparent to opaque)
  const innerDist = new Float32Array(pixelCount)
  innerDist.fill(1e10)
  for (let i = 0; i < pixelCount; i++) {
    if (alpha[i] <= 0.1) innerDist[i] = 0
  }
  chamferDistance(innerDist, width, height)

  // Composite outline
  const output = Buffer.alloc(pixelCount * 4)
  const innerEdge = opts.thickness * opts.positionValue
  const outerEdge = opts.thickness * (1 - opts.positionValue)
  const cr = opts.r * 255
  const cg = opts.g * 255
  const cb = opts.b * 255

  for (let i = 0; i < pixelCount; i++) {
    const isInside = alpha[i] > 0.1
    const signedDist =
      (isInside ? -innerDist[i] : outerDist[i]) + opts.threshold
    const low = -outerEdge
    const high = innerEdge

    let outlineAlpha = 0
    if (signedDist >= low - 0.5 && signedDist <= high + 0.5) {
      const t1 = smoothstep(low - 0.5, low + 0.5, signedDist)
      const t2 = 1 - smoothstep(high - 0.5, high + 0.5, signedDist)
      outlineAlpha = t1 * t2
    }

    const blendAlpha = outlineAlpha * opts.opacity
    const origR = rgba[i * 4]
    const origG = rgba[i * 4 + 1]
    const origB = rgba[i * 4 + 2]
    const origA = rgba[i * 4 + 3] / 255

    output[i * 4] = Math.round(origR * (1 - blendAlpha) + cr * blendAlpha)
    output[i * 4 + 1] = Math.round(origG * (1 - blendAlpha) + cg * blendAlpha)
    output[i * 4 + 2] = Math.round(origB * (1 - blendAlpha) + cb * blendAlpha)
    output[i * 4 + 3] = Math.round(Math.max(origA, blendAlpha) * 255)
  }

  return output
}
