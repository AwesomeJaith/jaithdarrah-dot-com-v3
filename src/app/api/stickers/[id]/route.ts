import { NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { getStickerById, updateStickerStatus } from "@/lib/stickers"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Support both header-based auth and query param (for Discord links)
  const url = new URL(request.url)
  const querySecret = url.searchParams.get("secret")
  const queryAction = url.searchParams.get("action") as
    | "approve"
    | "reject"
    | null
  const headerSecret = request.headers.get("x-admin-secret")

  const secret = querySecret ?? headerSecret
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let status: "approved" | "rejected"

  if (queryAction) {
    if (queryAction !== "approve" && queryAction !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
    status = queryAction === "approve" ? "approved" : "rejected"
  } else {
    const body = await request.json()
    status = body.status
    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
  }

  const sticker = await getStickerById(id)
  if (!sticker) {
    return NextResponse.json({ error: "Sticker not found" }, { status: 404 })
  }

  if (status === "rejected") {
    // Delete the image from blob storage
    await del(sticker.image_url).catch(() => {})
  }

  await updateStickerStatus(id, status)

  return NextResponse.json({ id, status })
}

// Also support GET for Discord approve/reject links
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(request.url)
  const secret = url.searchParams.get("secret")
  const action = url.searchParams.get("action") as "approve" | "reject" | null

  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const sticker = await getStickerById(id)
  if (!sticker) {
    return NextResponse.json({ error: "Sticker not found" }, { status: 404 })
  }

  const status = action === "approve" ? "approved" : "rejected"

  if (status === "rejected") {
    await del(sticker.image_url).catch(() => {})
  }

  await updateStickerStatus(id, status)

  // Return a simple HTML page for Discord link clicks
  return new Response(
    `<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="text-align:center">
        <h1>Sticker ${status === "approved" ? "Approved" : "Rejected"}</h1>
        <p>Sticker by <strong>${sticker.username}</strong> has been ${status}.</p>
      </div>
    </body></html>`,
    {
      headers: { "Content-Type": "text/html" },
    }
  )
}
