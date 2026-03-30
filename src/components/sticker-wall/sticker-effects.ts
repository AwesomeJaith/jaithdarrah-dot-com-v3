/** Resolve null/unknown effect to the default ("silver") */
export function resolveEffect(effect: string | null): string {
  if (effect === "rainbow") return "rainbow"
  return "silver"
}

/** CSS class name for a given effect id */
export function effectClassName(effect: string): string {
  return `sticker-effect-${effect}`
}

/** Mask styles to clip effect overlay to sticker shape */
export function effectMaskStyles(imageUrl: string): React.CSSProperties {
  return {
    maskImage: `url(${imageUrl})`,
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskImage: `url(${imageUrl})`,
    WebkitMaskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
  }
}

/**
 * Gradient builders for pointer-driven effects in the inspector.
 * Each takes a pointer position (0-100 range) and returns a CSS gradient string.
 */
export const EFFECT_GRADIENTS: Record<
  string,
  (px: number, py: number) => string
> = {
  silver: (px, py) => {
    // Diagonal shimmer sweep driven by pointer
    const sweep = (px + py) / 2
    return (
      `linear-gradient(135deg, ` +
      `oklch(0.7 0.01 250 / 0.3) 0%, ` +
      `oklch(0.7 0.01 250 / 0.3) ${sweep - 12}%, ` +
      `oklch(0.95 0.01 250 / 0.6) ${sweep}%, ` +
      `oklch(0.7 0.01 250 / 0.3) ${sweep + 12}%, ` +
      `oklch(0.7 0.01 250 / 0.3) 100%)`
    )
  },
  rainbow: (px, py) =>
    `conic-gradient(from ${(px - 50) * 3}deg at ${px}% ${py}%, ` +
    `oklch(0.75 0.18 25 / 0.3), ` +
    `oklch(0.8 0.18 90 / 0.3), ` +
    `oklch(0.75 0.18 150 / 0.3), ` +
    `oklch(0.8 0.18 220 / 0.3), ` +
    `oklch(0.75 0.18 290 / 0.3), ` +
    `oklch(0.75 0.18 25 / 0.3))`,
}
