import { memo, useMemo } from "react"

export const NOTCHED_CLIP_ID = "notched-clip"

const K = 0.5523 // Bezier tangent for quarter-circle approximation

type NotchedBorderProps = {
  containerWidth: number
  containerHeight: number
  notchWidth: number
  notchHeight: number
  cornerRadius?: number
  notchRadius?: number
}

function computeGeometry(
  w: number,
  h: number,
  nw: number,
  nh: number,
  cr: number,
  nr: number
) {
  const i = 0.5
  const L = i,
    T = i,
    R = w - i,
    B = h - i

  const maxCr = Math.min((R - L) / 2, (B - T) / 2)
  const r = Math.min(cr, maxCr)

  const notchLeft = (w - nw) / 2
  const notchRight = notchLeft + nw
  const notchTop = h - nh - i

  const maxNr = Math.min(nh / 2, nw / 4, r)
  const nr2 = Math.min(nr, maxNr)

  const ok = r * K
  const nk = nr2 * K

  const f = (n: number) => Math.round(n * 100) / 100

  return { i, L, T, R, B, r, notchLeft, notchRight, notchTop, nr2, ok, nk, f }
}

function buildNotchedPath(geo: ReturnType<typeof computeGeometry>): string {
  const { L, T, R, B, r, notchLeft, notchRight, notchTop, nr2, ok, nk, f } =
    geo

  return [
    `M ${f(L + r)},${T}`,
    `L ${f(R - r)},${T}`,
    `C ${f(R - r + ok)},${T} ${R},${f(T + r - ok)} ${R},${f(T + r)}`,
    `L ${R},${f(B - r)}`,
    `C ${R},${f(B - r + ok)} ${f(R - r + ok)},${B} ${f(R - r)},${B}`,
    `L ${f(notchRight + r)},${B}`,
    `C ${f(notchRight + r - ok)},${B} ${notchRight},${f(B - r + ok)} ${notchRight},${f(B - r)}`,
    `L ${notchRight},${f(notchTop + nr2)}`,
    `C ${notchRight},${f(notchTop + nr2 - nk)} ${f(notchRight - nr2 + nk)},${notchTop} ${f(notchRight - nr2)},${notchTop}`,
    `L ${f(notchLeft + nr2)},${notchTop}`,
    `C ${f(notchLeft + nr2 - nk)},${notchTop} ${notchLeft},${f(notchTop + nr2 - nk)} ${notchLeft},${f(notchTop + nr2)}`,
    `L ${notchLeft},${f(B - r)}`,
    `C ${notchLeft},${f(B - r + ok)} ${f(notchLeft - r + ok)},${B} ${f(notchLeft - r)},${B}`,
    `L ${f(L + r)},${B}`,
    `C ${f(L + r - ok)},${B} ${L},${f(B - r + ok)} ${L},${f(B - r)}`,
    `L ${L},${f(T + r)}`,
    `C ${L},${f(T + r - ok)} ${f(L + r - ok)},${T} ${f(L + r)},${T}`,
    `Z`,
  ].join(" ")
}

function buildNotchFill(geo: ReturnType<typeof computeGeometry>): string {
  const { B, r, notchLeft, notchRight, notchTop, nr2, ok, nk, f } = geo

  return [
    `M ${f(notchLeft - r)},${B}`,
    `L ${f(notchRight + r)},${B}`,
    `C ${f(notchRight + r - ok)},${B} ${notchRight},${f(B - r + ok)} ${notchRight},${f(B - r)}`,
    `L ${notchRight},${f(notchTop + nr2)}`,
    `C ${notchRight},${f(notchTop + nr2 - nk)} ${f(notchRight - nr2 + nk)},${notchTop} ${f(notchRight - nr2)},${notchTop}`,
    `L ${f(notchLeft + nr2)},${notchTop}`,
    `C ${f(notchLeft + nr2 - nk)},${notchTop} ${notchLeft},${f(notchTop + nr2 - nk)} ${notchLeft},${f(notchTop + nr2)}`,
    `L ${notchLeft},${f(B - r)}`,
    `C ${notchLeft},${f(B - r + ok)} ${f(notchLeft - r + ok)},${B} ${f(notchLeft - r)},${B}`,
    `Z`,
  ].join(" ")
}

export const NotchedBorder = memo(function NotchedBorder({
  containerWidth,
  containerHeight,
  notchWidth,
  notchHeight,
  cornerRadius = 14,
  notchRadius = 12,
}: NotchedBorderProps) {
  const { d, notchFill } = useMemo(() => {
    const geo = computeGeometry(
      containerWidth,
      containerHeight,
      notchWidth,
      notchHeight,
      cornerRadius,
      notchRadius
    )
    return {
      d: buildNotchedPath(geo),
      notchFill: buildNotchFill(geo),
    }
  }, [containerWidth, containerHeight, notchWidth, notchHeight, cornerRadius, notchRadius])

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10"
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={NOTCHED_CLIP_ID}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={notchFill} fill="var(--background)" />
      <path d={d} stroke="var(--border)" strokeWidth="1" fill="none" />
    </svg>
  )
})
