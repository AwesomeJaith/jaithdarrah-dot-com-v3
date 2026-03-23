import { NextResponse } from "next/server"
import { turso } from "@/lib/turso"

type ClashRoyalePlayer = {
  battleCount: number
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.CLASH_ROYALE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "CLASH_ROYALE_API_KEY not configured" },
      { status: 500 }
    )
  }

  // Fetch current player data via RoyaleAPI proxy (no IP whitelisting needed)
  const tag = encodeURIComponent("#JRR90228")
  const res = await fetch(
    `https://proxy.royaleapi.dev/v1/players/${tag}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Clash Royale data" },
      { status: res.status }
    )
  }

  const player: ClashRoyalePlayer = await res.json()
  const currentBattleCount = player.battleCount

  // Get previous battleCount
  const prev = await turso.execute({
    sql: "SELECT value FROM clash_royale_state WHERE key = ?",
    args: ["battleCount"],
  })

  const prevBattleCount = prev.rows.length > 0
    ? Number(prev.rows[0].value)
    : currentBattleCount

  const delta = currentBattleCount - prevBattleCount

  if (delta > 0) {
    // Attribute games to today (runs at 11:59 PM, capturing the full day)
    const now = new Date()
    const date = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    )
      .toISOString()
      .slice(0, 10)

    // Add to today's count (or create entry)
    await turso.execute({
      sql: `INSERT INTO clash_royale_daily (date, games)
            VALUES (?, ?)
            ON CONFLICT(date) DO UPDATE SET games = games + ?`,
      args: [date, delta, delta],
    })

    // Update stored battleCount
    await turso.execute({
      sql: "INSERT OR REPLACE INTO clash_royale_state (key, value) VALUES (?, ?)",
      args: ["battleCount", String(currentBattleCount)],
    })
  }

  return NextResponse.json({
    previousBattleCount: prevBattleCount,
    currentBattleCount,
    delta,
  })
}
