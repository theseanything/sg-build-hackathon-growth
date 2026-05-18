import { NextResponse } from "next/server"

import { toBusinessProfile } from "@/lib/business-profile-mapper"

const backendApiBaseUrl = (
  process.env.FUNDINGFIT_API_BASE_URL ??
  process.env.BACKEND_API_URL ??
  "http://localhost:8000"
).replace(/\/$/, "")

async function readJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const sessionId = request.headers.get("x-session-id")

  if (!sessionId) {
    return NextResponse.json({ detail: "Missing X-Session-ID header" }, { status: 401 })
  }

  try {
    const upstreamResponse = await fetch(`${backendApiBaseUrl}/api/business/me`, {
      headers: {
        "X-Session-ID": sessionId,
      },
      cache: "no-store",
    })
    const payload = await readJson(upstreamResponse)

    if (!upstreamResponse.ok) {
      return NextResponse.json(payload, { status: upstreamResponse.status })
    }

    return NextResponse.json(toBusinessProfile(payload), { status: upstreamResponse.status })
  } catch {
    return NextResponse.json(
      { detail: "Unable to reach the FundingFit API" },
      { status: 502 },
    )
  }
}
