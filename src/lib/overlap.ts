export const MAX_OVERLAP_RATIO = 0.2

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
