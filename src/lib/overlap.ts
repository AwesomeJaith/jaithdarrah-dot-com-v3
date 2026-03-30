export const MAX_OVERLAP_RATIO = 0.2
export const GRID_SIZE = 16

export function computeOverlapRatio(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): number {
  const overlapX = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx))
  const overlapY = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by))
  return (overlapX * overlapY) / (aw * ah)
}

/**
 * Encode an ImageData's alpha channel into a compact 16x16 bitmask (base64).
 * Each bit is 1 if the center pixel of that grid cell has alpha > 10.
 */
export function encodeAlphaMask(
  imageData: ImageData,
  gridSize = GRID_SIZE
): string {
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

export function decodeAlphaMask(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Compute overlap ratio using alpha masks. Falls back to AABB if either mask
 * is missing. Returns the fraction of A's opaque cells that overlap with B's.
 */
export function computeAlphaOverlapRatio(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  aMask: string | null,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  bMask: string | null
): number {
  // AABB fast-path: no bounding box overlap at all
  const overlapX = Math.min(ax + aw, bx + bw) - Math.max(ax, bx)
  const overlapY = Math.min(ay + ah, by + bh) - Math.max(ay, by)
  if (overlapX <= 0 || overlapY <= 0) return 0

  // Fallback to AABB when either mask is missing
  if (!aMask || !bMask) {
    return (overlapX * overlapY) / (aw * ah)
  }

  const aBytes = decodeAlphaMask(aMask)
  const bBytes = decodeAlphaMask(bMask)
  const gs = GRID_SIZE

  let totalOpaque = 0
  let overlapCount = 0

  for (let gy = 0; gy < gs; gy++) {
    for (let gx = 0; gx < gs; gx++) {
      const aBit = gy * gs + gx
      if (!((aBytes[aBit >> 3] >> (aBit & 7)) & 1)) continue
      totalOpaque++

      // Map A's grid cell center to world coordinates
      const worldX = ax + (gx + 0.5) * (aw / gs)
      const worldY = ay + (gy + 0.5) * (ah / gs)

      // Map world to B's grid
      const bgx = Math.floor(((worldX - bx) / bw) * gs)
      const bgy = Math.floor(((worldY - by) / bh) * gs)
      if (bgx < 0 || bgx >= gs || bgy < 0 || bgy >= gs) continue

      const bBit = bgy * gs + bgx
      if ((bBytes[bBit >> 3] >> (bBit & 7)) & 1) {
        overlapCount++
      }
    }
  }

  return totalOpaque === 0 ? 0 : overlapCount / totalOpaque
}
