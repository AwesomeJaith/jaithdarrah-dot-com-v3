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

  // Clamp bottom-edge radius so notch outer corners never overlap container corners
  const minSpace = Math.min(notchLeft - L, R - notchRight)
  const outerR = Math.min(r, Math.max(0, minSpace / 2))

  const ok = r * K
  const outerOk = outerR * K
  const nk = nr2 * K

  const f = (n: number) => Math.round(n * 100) / 100

  return { i, L, T, R, B, r, outerR, notchLeft, notchRight, notchTop, nr2, ok, outerOk, nk, f }
}

function buildNotchedPath(geo: ReturnType<typeof computeGeometry>): string {
  const { L, T, R, B, r, outerR, notchLeft, notchRight, notchTop, nr2, ok, outerOk, nk, f } = geo

  return [
    `M ${f(L + r)},${T}`,
    `L ${f(R - r)},${T}`,
    `C ${f(R - r + ok)},${T} ${R},${f(T + r - ok)} ${R},${f(T + r)}`,
    `L ${R},${f(B - outerR)}`,
    `C ${R},${f(B - outerR + outerOk)} ${f(R - outerR + outerOk)},${B} ${f(R - outerR)},${B}`,
    `L ${f(notchRight + outerR)},${B}`,
    `C ${f(notchRight + outerR - outerOk)},${B} ${notchRight},${f(B - outerR + outerOk)} ${notchRight},${f(B - outerR)}`,
    `L ${notchRight},${f(notchTop + nr2)}`,
    `C ${notchRight},${f(notchTop + nr2 - nk)} ${f(notchRight - nr2 + nk)},${notchTop} ${f(notchRight - nr2)},${notchTop}`,
    `L ${f(notchLeft + nr2)},${notchTop}`,
    `C ${f(notchLeft + nr2 - nk)},${notchTop} ${notchLeft},${f(notchTop + nr2 - nk)} ${notchLeft},${f(notchTop + nr2)}`,
    `L ${notchLeft},${f(B - outerR)}`,
    `C ${notchLeft},${f(B - outerR + outerOk)} ${f(notchLeft - outerR + outerOk)},${B} ${f(notchLeft - outerR)},${B}`,
    `L ${f(L + outerR)},${B}`,
    `C ${f(L + outerR - outerOk)},${B} ${L},${f(B - outerR + outerOk)} ${L},${f(B - outerR)}`,
    `L ${L},${f(T + r)}`,
    `C ${L},${f(T + r - ok)} ${f(L + r - ok)},${T} ${f(L + r)},${T}`,
    `Z`,
  ].join(" ")
}

function buildNotchFill(geo: ReturnType<typeof computeGeometry>): string {
  const { B, outerR, notchLeft, notchRight, notchTop, nr2, outerOk, nk, f } = geo

  return [
    `M ${f(notchLeft - outerR)},${B}`,
    `L ${f(notchRight + outerR)},${B}`,
    `C ${f(notchRight + outerR - outerOk)},${B} ${notchRight},${f(B - outerR + outerOk)} ${notchRight},${f(B - outerR)}`,
    `L ${notchRight},${f(notchTop + nr2)}`,
    `C ${notchRight},${f(notchTop + nr2 - nk)} ${f(notchRight - nr2 + nk)},${notchTop} ${f(notchRight - nr2)},${notchTop}`,
    `L ${f(notchLeft + nr2)},${notchTop}`,
    `C ${f(notchLeft + nr2 - nk)},${notchTop} ${notchLeft},${f(notchTop + nr2 - nk)} ${notchLeft},${f(notchTop + nr2)}`,
    `L ${notchLeft},${f(B - outerR)}`,
    `C ${notchLeft},${f(B - outerR + outerOk)} ${f(notchLeft - outerR + outerOk)},${B} ${f(notchLeft - outerR)},${B}`,
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
  }, [
    containerWidth,
    containerHeight,
    notchWidth,
    notchHeight,
    cornerRadius,
    notchRadius,
  ])

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
      <path d={notchFill} className="fill-background stroke-background" />
      <path d={d} className="fill-none stroke-sticker-border stroke-1" />
    </svg>
  )
})
