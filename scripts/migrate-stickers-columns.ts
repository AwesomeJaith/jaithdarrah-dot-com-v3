import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@libsql/client"

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
  // Add rotation column if missing (table may have been created before it was added to schema)
  try {
    await turso.execute(
      `ALTER TABLE stickers ADD COLUMN rotation REAL NOT NULL DEFAULT 0`
    )
    console.log("Added rotation column")
  } catch {
    console.log("rotation column already exists")
  }

  // Add effect column if missing
  try {
    await turso.execute(`ALTER TABLE stickers ADD COLUMN effect TEXT`)
    console.log("Added effect column")
  } catch {
    console.log("effect column already exists")
  }

  // Add alpha_mask column if missing
  try {
    await turso.execute(`ALTER TABLE stickers ADD COLUMN alpha_mask TEXT`)
    console.log("Added alpha_mask column")
  } catch {
    console.log("alpha_mask column already exists")
  }

  console.log("Migration complete")
}

migrate().catch(console.error)
