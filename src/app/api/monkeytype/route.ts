import { NextResponse } from "next/server"

export async function GET() {
  const apeKey = process.env.APE_KEY
  if (!apeKey) {
    return NextResponse.json(
      { error: "APE_KEY not configured" },
      { status: 500 }
    )
  }

  const res = await fetch(
    "https://api.monkeytype.com/users/currentTestActivity",
    {
      headers: {
        Authorization: `ApeKey ${apeKey}`,
      },
      next: { revalidate: 3600 },
    }
  )

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch MonkeyType data" },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
