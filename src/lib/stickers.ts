import { turso } from "@/lib/turso"

export type Sticker = {
  id: string
  image_url: string
  blur_data_url: string | null
  username: string
  message: string | null
  effect: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
  status: "pending" | "approved" | "rejected"
  created_at: string
  approved_at: string | null
}

export async function getStickersByViewport(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): Promise<Sticker[]> {
  const result = await turso.execute({
    sql: `SELECT * FROM stickers
          WHERE status = 'approved'
            AND x + width >= ?
            AND x <= ?
            AND y + height >= ?
            AND y <= ?
          ORDER BY created_at ASC`,
    args: [minX, maxX, minY, maxY],
  })
  return result.rows as unknown as Sticker[]
}

export async function getAllApprovedStickers(): Promise<Sticker[]> {
  const result = await turso.execute({
    sql: `SELECT * FROM stickers WHERE status = 'approved' ORDER BY created_at ASC`,
    args: [],
  })
  return result.rows as unknown as Sticker[]
}

export async function getPendingStickers(): Promise<Sticker[]> {
  const result = await turso.execute({
    sql: `SELECT * FROM stickers WHERE status = 'pending' ORDER BY created_at DESC`,
    args: [],
  })
  return result.rows as unknown as Sticker[]
}

export async function createSticker(data: {
  image_url: string
  blur_data_url: string | null
  username: string
  message: string | null
  effect: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
}): Promise<Sticker> {
  const result = await turso.execute({
    sql: `INSERT INTO stickers (image_url, blur_data_url, username, message, effect, x, y, width, height, rotation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *`,
    args: [
      data.image_url,
      data.blur_data_url,
      data.username,
      data.message,
      data.effect,
      data.x,
      data.y,
      data.width,
      data.height,
      data.rotation,
    ],
  })
  return result.rows[0] as unknown as Sticker
}

export async function updateStickerStatus(
  id: string,
  status: "approved" | "rejected"
): Promise<void> {
  await turso.execute({
    sql: `UPDATE stickers SET status = ?, approved_at = CASE WHEN ? = 'approved' THEN datetime('now') ELSE NULL END WHERE id = ?`,
    args: [status, status, id],
  })
}

export async function deleteStickerById(id: string): Promise<void> {
  await turso.execute({
    sql: `DELETE FROM stickers WHERE id = ?`,
    args: [id],
  })
}

export async function getStickerById(id: string): Promise<Sticker | undefined> {
  const result = await turso.execute({
    sql: `SELECT * FROM stickers WHERE id = ?`,
    args: [id],
  })
  return result.rows[0] as unknown as Sticker | undefined
}

/**
 * Check if placing a sticker at (x, y) with given dimensions would overlap
 * too much with existing approved stickers. Returns true if placement is allowed.
 */
export async function checkOverlap(
  x: number,
  y: number,
  width: number,
  height: number,
  maxOverlapRatio = 0.5
): Promise<boolean> {
  // Query stickers in the vicinity
  const margin = Math.max(width, height)
  const result = await turso.execute({
    sql: `SELECT x, y, width, height FROM stickers
          WHERE status = 'approved'
            AND x BETWEEN ? AND ?
            AND y BETWEEN ? AND ?`,
    args: [x - margin, x + margin, y - margin, y + margin],
  })

  const newLeft = x
  const newRight = x + width
  const newTop = y
  const newBottom = y + height
  const newArea = width * height

  for (const row of result.rows) {
    const sx = Number(row.x)
    const sy = Number(row.y)
    const sw = Number(row.width)
    const sh = Number(row.height)

    const overlapX = Math.max(
      0,
      Math.min(newRight, sx + sw) - Math.max(newLeft, sx)
    )
    const overlapY = Math.max(
      0,
      Math.min(newBottom, sy + sh) - Math.max(newTop, sy)
    )
    const overlapArea = overlapX * overlapY

    if (overlapArea / newArea > maxOverlapRatio) {
      return false // Too much overlap
    }
  }

  return true // Placement allowed
}
