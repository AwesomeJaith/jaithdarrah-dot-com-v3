import { config } from "dotenv"
config({ path: ".env.local" })
import { createClient } from "@libsql/client"

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
  await turso.execute(`ALTER TABLE stickers ADD COLUMN blur_data_url TEXT`)

  console.log("Added blur_data_url column to stickers table")
}

migrate().catch(console.error)
