import express from "express"
import cors from "cors"
import multer from "multer"
import rateLimit from "express-rate-limit"
import { processSticker, warmupModel } from "./pipeline.js"

const app = express()
const PORT = parseInt(process.env.PORT || "3001", 10)

// Trust proxy for correct IP behind AWS LB / reverse proxy
app.set("trust proxy", 1)

// --- CORS ---

const ALLOWED_ORIGINS = [
  "https://jaithdarrah.com",
  "https://www.jaithdarrah.com",
  "http://localhost:3000",
]

if (process.env.ALLOWED_ORIGIN) {
  ALLOWED_ORIGINS.push(process.env.ALLOWED_ORIGIN)
}

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["POST", "GET"],
  })
)

// --- Rate limiting (15 req/min per IP + user-agent) ---

app.use(
  "/process",
  rateLimit({
    windowMs: 60_000,
    max: 15,
    keyGenerator: (req) => `${req.ip}::${req.get("user-agent") ?? "unknown"}`,
    message: { error: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// --- Concurrency limiter ---

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || "2", 10)
let activeRequests = 0

function concurrencyGuard(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (activeRequests >= MAX_CONCURRENT) {
    res.status(503).json({ error: "Server busy. Please try again shortly." })
    return
  }
  activeRequests++
  res.on("finish", () => {
    activeRequests--
  })
  next()
}

// --- File upload ---

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
})

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]

// --- Routes ---

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.post(
  "/process",
  concurrencyGuard,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided." })
        return
      }

      if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
        res
          .status(400)
          .json({ error: "Only PNG, JPEG, and WebP images are allowed." })
        return
      }

      console.log(
        `Processing ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)} KB)`
      )
      const start = Date.now()

      const result = await processSticker(req.file.buffer)

      console.log(
        `Done in ${((Date.now() - start) / 1000).toFixed(1)}s → ${result.width}×${result.height}`
      )

      res.json(result)
    } catch (err) {
      console.error("Processing failed:", err)
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : "Failed to process image. Please try another one.",
      })
    }
  }
)

// --- Startup ---

async function start() {
  await warmupModel()
  app.listen(PORT, () => {
    console.log(`Sticker server listening on port ${PORT}`)
  })
}

start().catch((err) => {
  console.error("Failed to start server:", err)
  process.exit(1)
})
