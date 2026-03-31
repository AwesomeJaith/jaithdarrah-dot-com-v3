export const MORPH_SPEED = 1
export const CARD_WIDTH = 320
export const CARD_WIDTH_COMPACT = 260

export const springTransition = {
  type: "spring" as const,
  stiffness: 550 / MORPH_SPEED,
  damping: 45,
  mass: 0.7,
}

export const fadeTransition = {
  duration: 0.15 * MORPH_SPEED,
}
