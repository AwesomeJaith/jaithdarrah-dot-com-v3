import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import {
  createSticker,
  checkOverlap,
  getStickersByViewport,
} from "@/lib/stickers"

async function sendDiscordNotification(sticker: {
  id: string
  image_url: string
  username: string
  message: string | null
}) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL
  if (!webhookUrl) return

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaithdarrah.com"
  const adminSecret = process.env.ADMIN_SECRET

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "New Sticker Submission",
          color: 0xfbbf24, // yellow
          fields: [
            { name: "Username", value: sticker.username, inline: true },
            {
              name: "Message",
              value: sticker.message || "_No message_",
              inline: true,
            },
          ],
          image: { url: sticker.image_url },
          footer: {
            text: `ID: ${sticker.id}`,
          },
        },
      ],
      content: `[Approve](${siteUrl}/api/stickers/${sticker.id}?action=approve&secret=${adminSecret}) | [Reject](${siteUrl}/api/stickers/${sticker.id}?action=reject&secret=${adminSecret})`,
    }),
  }).catch(() => {
    // Don't fail the request if Discord notification fails
  })
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const image = formData.get("image") as File | null
    const blurDataUrl = formData.get("blur_data_url") as string | null
    const username = formData.get("username") as string | null
    const message = formData.get("message") as string | null
    const effect = formData.get("effect") as string | null
    const x = Number(formData.get("x"))
    const y = Number(formData.get("y"))
    const width = Number(formData.get("width") ?? 100)
    const height = Number(formData.get("height") ?? 100)
    const rotation = Number(formData.get("rotation") ?? 0)

    if (!image || !username) {
      return NextResponse.json(
        { error: "Image and username are required" },
        { status: 400 }
      )
    }

    if (username.length > 30) {
      return NextResponse.json(
        { error: "Username must be 30 characters or less" },
        { status: 400 }
      )
    }

    if (message && message.length > 200) {
      return NextResponse.json(
        { error: "Message must be 200 characters or less" },
        { status: 400 }
      )
    }

    if (isNaN(x) || isNaN(y)) {
      return NextResponse.json(
        { error: "Valid x and y coordinates are required" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ["image/avif"]
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "Only AVIF images are allowed" },
        { status: 400 }
      )
    }

    // Validate file size (10MB max as a safeguard)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be 10MB or less" },
        { status: 400 }
      )
    }

    // Check overlap
    const allowed = await checkOverlap(x, y, width, height)
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Too much overlap with existing stickers. Try a different spot!",
        },
        { status: 409 }
      )
    }

    // Upload to Vercel Blob
    const blob = await put(`stickers/${Date.now()}-${image.name}`, image, {
      access: "public",
      contentType: image.type,
    })

    // Save to database
    const sticker = await createSticker({
      image_url: blob.url,
      blur_data_url: blurDataUrl || null,
      username: username.trim(),
      message: message?.trim() || null,
      effect: effect?.trim() || null,
      x,
      y,
      width,
      height,
      rotation,
    })

    // Send Discord notification
    await sendDiscordNotification(sticker)

    return NextResponse.json(sticker, { status: 201 })
  } catch (error) {
    console.error("Error creating sticker:", error)
    return NextResponse.json(
      { error: "Failed to create sticker" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const minX = Number(searchParams.get("minX") ?? -5000)
  const minY = Number(searchParams.get("minY") ?? -5000)
  const maxX = Number(searchParams.get("maxX") ?? 5000)
  const maxY = Number(searchParams.get("maxY") ?? 5000)

  try {
    const stickers = await getStickersByViewport(minX, minY, maxX, maxY)
    return NextResponse.json(stickers)
  } catch (error) {
    console.error("Error fetching stickers:", error)
    return NextResponse.json(
      { error: "Failed to fetch stickers" },
      { status: 500 }
    )
  }
}
