import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@libsql/client"

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS stickers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      image_url TEXT NOT NULL,
      username TEXT NOT NULL,
      message TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL DEFAULT 100,
      height REAL NOT NULL DEFAULT 100,
      rotation REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at TEXT
    )
  `)

  await turso.execute(
    `CREATE INDEX IF NOT EXISTS idx_stickers_status ON stickers(status)`
  )

  await turso.execute(
    `CREATE INDEX IF NOT EXISTS idx_stickers_position ON stickers(x, y)`
  )

  console.log("Stickers table created successfully")
}

migrate().catch(console.error)
